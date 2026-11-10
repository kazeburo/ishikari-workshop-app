package main

import (
	"bytes"
	"embed"
	"flag"
	"image"
	"image/color"
	_ "image/jpeg"
	"image/png"
	"io"
	"io/fs"
	"log"
	"math"
	"net/http"
	"strconv"
	"time"
)

//go:embed web/*
var assets embed.FS

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	cert := flag.String("cert", "", "HTTPS certificate PEM (optional)")
	key := flag.String("key", "", "HTTPS private key PEM (optional)")
	flag.Parse()
	files, _ := fs.Sub(assets, "web")
	mux := http.NewServeMux()
	mux.Handle("/", http.FileServer(http.FS(files)))
	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Write([]byte("ok"))
	})
	mux.HandleFunc("/api/transform", transform)
	srv := &http.Server{Addr: *addr, Handler: mux, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10}
	log.Printf("listening on %s", *addr)
	if *cert != "" || *key != "" {
		log.Fatal(srv.ListenAndServeTLS(*cert, *key))
	}
	log.Fatal(srv.ListenAndServe())
}

func transform(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		http.Error(w, "POST required", 405)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8<<20)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "画像が大きすぎます（最大8MB）", 413)
		return
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || cfg.Width < 1 || cfg.Height < 1 || cfg.Width > 2048 || cfg.Height > 2048 {
		http.Error(w, "2048×2048以下のPNG/JPEGを送ってください", 400)
		return
	}
	mode := r.URL.Query().Get("mode")
	if mode != "mosaic" && mode != "kaleidoscope" {
		http.Error(w, "変換方法が不正です", 400)
		return
	}
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		http.Error(w, "画像を読み取れません", 400)
		return
	}
	amount, _ := strconv.Atoi(r.URL.Query().Get("amount"))
	var dst image.Image
	if mode == "mosaic" {
		if amount < 4 {
			amount = 4
		}
		if amount > 64 {
			amount = 64
		}
		dst = mosaic(src, amount)
	} else {
		if amount < 3 {
			amount = 3
		}
		if amount > 16 {
			amount = 16
		}
		dst = kaleidoscope(src, amount)
	}
	var out bytes.Buffer
	if err := png.Encode(&out, dst); err != nil {
		http.Error(w, "変換に失敗しました", 500)
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "no-store")
	w.Write(out.Bytes())
	log.Printf("transformed mode=%s size=%dx%d", mode, cfg.Width, cfg.Height)
}

func mosaic(src image.Image, block int) image.Image {
	b := src.Bounds()
	dst := image.NewRGBA(image.Rect(0, 0, b.Dx(), b.Dy()))
	for y := 0; y < b.Dy(); y += block {
		for x := 0; x < b.Dx(); x += block {
			x1, y1 := min(x+block, b.Dx()), min(y+block, b.Dy())
			var rr, gg, bb uint64
			for yy := y; yy < y1; yy++ {
				for xx := x; xx < x1; xx++ {
					c := color.NRGBAModel.Convert(src.At(b.Min.X+xx, b.Min.Y+yy)).(color.NRGBA)
					// Composite transparency onto the white backing before averaging.
					a := uint64(c.A)
					rr += (uint64(c.R)*a + 255*(255-a)) / 255
					gg += (uint64(c.G)*a + 255*(255-a)) / 255
					bb += (uint64(c.B)*a + 255*(255-a)) / 255
				}
			}
			n := uint64((x1 - x) * (y1 - y))
			c := color.NRGBA{uint8(rr / n), uint8(gg / n), uint8(bb / n), 255}
			gap := max(1, block/12)
			bevel := max(1, block/14)
			for yy := y; yy < y1; yy++ {
				for xx := x; xx < x1; xx++ {
					localX, localY := xx-x, yy-y
					if localX < gap || localY < gap {
						dst.SetRGBA(xx, yy, color.RGBA{218, 216, 210, 255})
						continue
					}
					shade := 0.0
					if localX < gap+bevel || localY < gap+bevel {
						shade = 0.32 // light on the upper and left edges
					} else if localX >= block-bevel || localY >= block-bevel {
						shade = -0.28
					}
					tint := func(v uint8) uint8 {
						if shade > 0 {
							return uint8(float64(v) + (255-float64(v))*shade)
						}
						return uint8(float64(v) * (1 + shade))
					}
					dst.SetRGBA(xx, yy, color.RGBA{tint(c.R), tint(c.G), tint(c.B), 255})
				}
			}
		}
	}
	return dst
}

func kaleidoscope(src image.Image, sectors int) image.Image {
	b := src.Bounds()
	n := min(b.Dx(), b.Dy())
	dst := image.NewRGBA(image.Rect(0, 0, n, n))
	cx, cy := float64(b.Dx()-1)/2, float64(b.Dy()-1)/2
	center := float64(n-1) / 2
	wedge := 2 * math.Pi / float64(sectors)
	for y := 0; y < n; y++ {
		for x := 0; x < n; x++ {
			dx, dy := float64(x)-center, float64(y)-center
			radius := math.Hypot(dx, dy)
			theta := math.Mod(math.Atan2(dy, dx)+2*math.Pi, wedge)
			if theta > wedge/2 {
				theta = wedge - theta
			}
			sx := int(math.Round(cx + radius*math.Cos(theta)))
			sy := int(math.Round(cy + radius*math.Sin(theta)))
			sx = reflectIndex(sx, b.Dx())
			sy = reflectIndex(sy, b.Dy())
			dst.Set(x, y, src.At(b.Min.X+sx, b.Min.Y+sy))
		}
	}
	return dst
}

func reflectIndex(v, n int) int {
	if n <= 1 {
		return 0
	}
	p := 2 * (n - 1)
	v = ((v % p) + p) % p
	if v >= n {
		v = p - v
	}
	return v
}

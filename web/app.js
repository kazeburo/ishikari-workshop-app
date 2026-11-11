'use strict';
const $=id=>document.getElementById(id), canvas=$('source'), ctx=canvas.getContext('2d');
let stream=null, drawing=false, last=null, resultURL=null;
function sample(){ctx.fillStyle='#fff7df';ctx.fillRect(0,0,640,640);const colors=['#ed4981','#ffd351','#40bbac','#5175dc','#a66de0'];for(let i=0;i<16;i++){ctx.fillStyle=colors[i%5];ctx.beginPath();ctx.arc(55+(i*137)%540,55+(i*193)%540,25+(i*17)%65,0,Math.PI*2);ctx.fill()}ctx.fillStyle='#243347';ctx.font='bold 72px sans-serif';ctx.fillText('HELLO!',175,340)}
function disc(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function shape(color, ...points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath();
  ctx.fill();
}

function sky(top, bottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 640);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 640, 640);
}

function flowers() {
  sky('#a2dceb', '#d9f5b7');
  shape('#418a56', [0,475], [220,365], [420,465], [640,375], [640,640], [0,640]);
  const blooms = [
    [155,220,46,'#ff546f'], [420,160,39,'#a168d4'],
    [485,375,48,'#f99543'], [270,390,40,'#f766b4'], [75,425,26,'#8460d0']
  ];
  for (const [x,y,r,color] of blooms) {
    shape('#2d7251', [x-5,y], [x+5,y], [x+6,640], [x-6,640]);
    shape('#53a658', [x,y+105], [x+22,y+60], [x+64,y+52], [x+40,y+95]);
    for (let i=0; i<7; i++) {
      const angle = i * Math.PI * 2 / 7;
      disc(x+Math.cos(angle)*r, y+Math.sin(angle)*r, r*0.56, color);
    }
    disc(x,y,r*0.55,'#ffe568');
  }
}

function sea() {
  sky('#b9f3ef', '#378eb7');
  for (let i=0; i<16; i++) {
    disc((i*137+20)%640, (i*97+120)%620, 3+i%7, '#ffffff65');
  }
  shape('#f4d99b', [0,570], [180,540], [420,590], [640,550], [640,640], [0,640]);
  for (const x of [38,105,565,603]) {
    shape('#338f84', [x,590], [x-17,543], [x+9,482], [x+4,544], [x+14,590]);
  }
}

function fish() {
  sea();
  for (const [x,y,r,color] of [[320,285,88,'#ffb548'],[150,160,49,'#f87384'],[470,430,61,'#aa86ee']]) {
    shape(color, [x-r*.6,y], [x-r*1.55,y-r*.7], [x-r*1.55,y+r*.7]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x,y,r,r*.62,0,0,Math.PI*2);
    ctx.fill();
    disc(x+r*.45,y-r*.12,r*.17,'#fff8e2');
    disc(x+r*.49,y-r*.12,r*.08,'#21354c');
  }
}

function snow() {
  sky('#a1cbe7', '#e6f5fe');
  disc(500,120,47,'#fff5cf');
  shape('#83aac5', [0,385], [140,230], [260,347], [390,240], [640,410], [640,640], [0,640]);
  shape('#f4fbff', [0,410], [160,385], [360,465], [640,390], [640,640], [0,640]);
  for (const [x,y,h] of [[70,440,120],[125,425,84],[555,465,130],[600,445,92]]) {
    shape('#497982', [x,y-h], [x-h*.32,y], [x+h*.32,y]);
    shape('#dceff4', [x,y-h], [x-h*.22,y-h*.31], [x+h*.08,y-h*.45], [x+h*.19,y-h*.42]);
  }
}

function space() {
  sky('#181a41', '#514479');
  for (let i=0; i<55; i++) {
    disc((i*149+18)%640, (i*107+53)%640, 1+i%3, i%4===0?'#fbe2a1':'#e9e2ff');
  }
  disc(535,138,63,'#efd2a1');
  disc(510,122,11,'#d8af86');
  disc(555,162,16,'#d8af86');
  disc(540,100,7,'#d8af86');
}

const presets = {sample, flowers, fish, snow, space, sea};
function point(e){const b=canvas.getBoundingClientRect();return [(e.clientX-b.left)*640/b.width,(e.clientY-b.top)*640/b.height]}
canvas.addEventListener('pointerdown',e=>{drawing=true;canvas.setPointerCapture(e.pointerId);last=point(e);stroke(last,last)});
function stroke(a,b){ctx.strokeStyle=$('color').value;ctx.lineWidth=Number($('width').value);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(b[0]+.01,b[1]);ctx.stroke()}
canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=point(e);stroke(last,p);last=p});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drawing=false);
$('sample').onclick=()=>presets[$('preset').value]();$('clear').onclick=()=>{ctx.fillStyle='white';ctx.fillRect(0,0,640,640)};
function place(img,w,h){ctx.fillStyle='white';ctx.fillRect(0,0,640,640);const scale=Math.min(640/w,640/h);ctx.drawImage(img,(640-w*scale)/2,(640-h*scale)/2,w*scale,h*scale)}
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error)}
$('file').onchange=()=>{const file=$('file').files[0];if(!file)return;if(file.size>20*1024*1024){message('20MB以下の写真をえらんでください。',true);return}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{place(img,img.naturalWidth,img.naturalHeight);URL.revokeObjectURL(url)};img.onerror=()=>{URL.revokeObjectURL(url);message('写真を開けませんでした。PNGまたはJPEGをお試しください。',true)};img.src=url;$('file').value=''};
function closeCamera(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null;$('cameraBox').hidden=true}
$('camera').onclick=async()=>{closeCamera();if(!navigator.mediaDevices?.getUserMedia){message('この接続ではカメラを使えません。お手本・背景、写真選択、お絵かきが使えます。カメラにはHTTPSまたはlocalhost接続が必要です。',true);return}try{stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:640}},audio:false});$('video').srcObject=stream;$('cameraBox').hidden=false}catch{message('カメラを開けません。利用許可やカメラの接続を確認してください。写真やお絵かきも使えます。',true)}};
$('closeCamera').onclick=closeCamera;$('capture').onclick=()=>{const v=$('video');if(!v.videoWidth){message('カメラの準備ができるまでお待ちください。',true);return}place(v,v.videoWidth,v.videoHeight);closeCamera()};window.addEventListener('pagehide',closeCamera);
function mode(){return document.querySelector('input[name=mode]:checked').value}
for(const radio of document.querySelectorAll('[name=mode]'))radio.onchange=()=>{const mosaic=mode()==='mosaic';$('amountLabel').textContent=mosaic?'タイルの大きさ':'もようの数';$('amount').min=mosaic?4:3;$('amount').max=mosaic?64:16;$('amount').value=mosaic?16:8;$('amountValue').textContent=$('amount').value};
$('amount').oninput=()=>{$('amountValue').textContent=$('amount').value};
async function health(){try{const res=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.timeout(2500)});if(!res.ok)throw Error();$('health').textContent='● サーバにつながっています';$('health').className='ok'}catch{$('health').textContent='● サーバに届きません';$('health').className='off'}}
$('convert').onclick=async()=>{const button=$('convert');button.disabled=true;message('サーバに画像を送っています。どんな作品になるかな…');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error();const res=await fetch(`/api/transform?mode=${mode()}&amount=${$('amount').value}`,{method:'POST',headers:{'Content-Type':'image/png'},body:blob,signal:controller.signal});if(!res.ok)throw Error();const result=await res.blob();if(resultURL)URL.revokeObjectURL(resultURL);resultURL=URL.createObjectURL(result);$('result').src=resultURL;$('result').hidden=false;$('empty').hidden=true;$('download').href=resultURL;$('download').hidden=false;message('作品が届きました！ サーバが画像を計算してくれました。')}catch{message('作品が届きませんでした。サーバやネットワークの様子を調べてみよう。直したら、もう一度このボタンを押してね。',true)}finally{clearTimeout(timer);button.disabled=false;health()}};
sample();health();setInterval(health,4000);

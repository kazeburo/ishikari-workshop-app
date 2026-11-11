VERSION=0.0.2
LDFLAGS=-ldflags "-w -s -X main.version=${VERSION}"
all: ishikaridc-workshop-app

.PHONY: ishikaridc-workshop-app linux check lint

ishikaridc-workshop-app: *.go
	go build $(LDFLAGS) -o ishikaridc-workshop-app

linux: *.go
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o ishikaridc-workshop-app

check:
	go test -v ./...

lint:
	golangci-lint run --timeout 5m ./...
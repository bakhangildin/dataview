proto:
	protoc \
		--plugin=./frontend/node_modules/.bin/protoc-gen-ts \
		--ts_out=./frontend/src \
		--ts_opt=optimize_code_size \
		--go_out=./backend --go_opt=paths=source_relative \
		--go-grpc_out=./backend --go-grpc_opt=paths=source_relative \
		./contracts/*.proto

build:
	@cd frontend && pnpm run build
	@cp -r ./frontend/dist ./backend/handler/
	@cd backend && go build -o bin/dataview -tags embed .

MAKEFLAGS += j -2
dev: dev_backend dev_frontent

dev_backend:
	@cd backend && go run .

dev_frontent:
	@cd frontend && VITE_API_BASE_URL=http://localhost:4000 pnpm run dev

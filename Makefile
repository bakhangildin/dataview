proto:
	protoc \
		--plugin=./frontend/node_modules/.bin/protoc-gen-ts \
		--ts_out=./frontend/src \
		--ts_opt=optimize_code_size \
		--go_out=./backend --go_opt=paths=source_relative \
		--go-grpc_out=./backend --go-grpc_opt=paths=source_relative \
		./contracts/*.proto

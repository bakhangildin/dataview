//go:build !embed

package handler

import (
	"net/http"
	"os"
)

func Static() http.Handler {
	return http.FileServerFS(os.DirFS("../frontend/dist/"))
}

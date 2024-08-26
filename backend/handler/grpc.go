package handler

import (
	"fmt"
	"net/http"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"
)

type handler struct {
	wh *grpcweb.WrappedGrpcServer
}

func (h *handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	} else if r.Method == http.MethodPost {
		h.wh.ServeHTTP(w, r)
		return
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
		w.Write([]byte(fmt.Sprintf("%s only for grpc-web calls", r.URL.Path)))
		return
	}
}

func GrpcWebHandler(s *grpc.Server) http.Handler {
	return http.StripPrefix("/grpc", &handler{wh: grpcweb.WrapServer(s)})
}

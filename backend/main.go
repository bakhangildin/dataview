package main

import (
	"backend/contracts"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Explorer struct {
	contracts.UnimplementedExplorerServer
}

func (s *Explorer) Ls(ctx context.Context, in *contracts.LsRequest) (*contracts.LsResponse, error) {
	out := &contracts.LsResponse{}
	loc, err := filepath.Abs(in.GetLocation())
	if err != nil {
		return out, err
	}
	out.Location = loc
	entries, err := os.ReadDir(loc)
	if err != nil {
		return out, err
	}
	out.Files = append(out.Files, &contracts.File{
		Name:     "..",
		Path:     "..",
		FileType: contracts.File_FILE_TYPE_DIR,
		Size:     0,
	})
	for _, e := range entries {
		f := &contracts.File{}
		f.Name = e.Name()
		f.Path = path.Join(loc, f.Name)
		if e.Type().IsRegular() {
			f.FileType = contracts.File_FILE_TYPE_FILE
		} else if e.Type().IsDir() {
			f.FileType = contracts.File_FILE_TYPE_DIR
		} else {
			fmt.Printf("file %s [%d] is skipped\n", f.Path, e.Type())
			continue
		}
		stat, err := os.Stat(f.Path)
		if err != nil {
			return out, err
		}
		f.Size = int32(stat.Size())
		if runtime.GOOS == "linux" {
			if unixStat, ok := stat.Sys().(*syscall.Stat_t); ok {
				f.CreatedAt = timestamppb.New(time.Unix(unixStat.Ctim.Unix()))
			}
		} else {
			fmt.Printf("platform %s is skipped", runtime.GOOS)
		}
		out.Files = append(out.Files, f)
	}
	return out, nil
}

type GRPCHandler struct {
	grpcWebServer *grpcweb.WrappedGrpcServer
}

func (h *GRPCHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	} else if r.Method == http.MethodPost {
		h.grpcWebServer.ServeHTTP(w, r)
		return
	} else {
		w.WriteHeader(http.StatusMethodNotAllowed)
		w.Write([]byte(fmt.Sprintf("%s only for grpc-web calls", r.URL.Path)))
		return
	}
}
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Access-Control-Allow-Origin", r.Header.Get("Origin"))
		w.Header().Add("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, GET, POST, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-User-Agent, X-Grpc-Web")
		next.ServeHTTP(w, r)
	})
}

func main() {
	s := grpc.NewServer()
	grpcWebServer := grpcweb.WrapServer(s)
	contracts.RegisterExplorerServer(s, &Explorer{})
	mux := chi.NewMux()
	mux.Use(
		middleware.Logger,
		corsMiddleware,
	)
	h := &GRPCHandler{
		grpcWebServer: grpcWebServer,
	}
	mux.Handle("/*", http.FileServerFS(os.DirFS("./dist/")))
	mux.Handle("/grpc/*", http.StripPrefix("/grpc", h))
	log.Fatal(http.ListenAndServe(":4000", mux))
	return
}

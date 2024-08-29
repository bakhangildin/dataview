package main

import (
	"backend/contracts"
	"backend/handler"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type Explorer struct {
	contracts.UnimplementedExplorerServer
}

func (e *Explorer) TimeStream(_ *emptypb.Empty, s grpc.ServerStreamingServer[timestamppb.Timestamp]) error {
	t := time.NewTicker(time.Second)
	defer t.Stop()
	for {
		if err := s.Send(timestamppb.New(time.Now().UTC())); err != nil {
			return err
		}
		<-t.C
	}
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
		Path:     filepath.Clean(path.Join(loc, "..")),
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
		f.CreatedAt = timestamppb.New(getCreatedAt(stat))
		out.Files = append(out.Files, f)
	}
	return out, nil
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
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	s := grpc.NewServer()
	contracts.RegisterExplorerServer(s, &Explorer{})

	mux := chi.NewMux()
	mux.Use(
		middleware.Logger,
		corsMiddleware,
	)
	mux.Handle("/*", handler.Static())
	mux.Handle("/grpc/*", handler.GrpcWebHandler(s))
	httpServer := &http.Server{
		Addr:    ":4000",
		Handler: mux,
	}
	wg := &sync.WaitGroup{}
	wg.Add(1)
	go func() {
		if err := httpServer.ListenAndServe(); err != nil {
			if errors.Is(err, http.ErrServerClosed) {
				slog.Info("server stopped")
			} else {
				slog.Error("ListenAndServe", "err", err)
			}
			wg.Done()
		}
	}()
	<-ctx.Done()
	shutdownContext, shutdownCancel := context.WithTimeout(context.Background(), time.Millisecond*700)
	defer shutdownCancel()
	httpServer.Shutdown(shutdownContext)
	wg.Wait()
}

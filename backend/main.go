package main

import (
	"backend/app"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/rpc/v2"
	"github.com/gorilla/rpc/v2/json2"
)

func main() {
	Explorer := &app.Explorer{}
	s := rpc.NewServer()
	s.RegisterCodec(json2.NewCodec(), "application/json")
	s.RegisterCodec(json2.NewCodec(), "application/json;charset=UTF-8")
	s.RegisterService(Explorer, "Explorer")
	mux := chi.NewMux()
	mux.Use(middleware.Logger)
	mux.HandleFunc("/rpc", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Access-Control-Allow-Origin", "*")
		w.Header().Add("Access-Control-Allow-Headers", "*")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		s.ServeHTTP(w, r)
	})
	log.Fatal(http.ListenAndServe(":4000", mux))
}

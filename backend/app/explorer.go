package app

import (
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"reflect"
	"syscall"
	"time"
)

type hr *http.Request

type Empty struct{}

type Location struct{ Location string }

type LsR struct {
	Files    []File
	Location string
}

type File struct {
	Name      string
	Path      string
	Type      string
	Size      int
	CreatedAt int
}

func NewFile(e fs.DirEntry, location string) (File, error) {
	f := File{}
	f.Name = e.Name()
	f.Path = path.Join(location, f.Name)
	stat, err := os.Stat(f.Path)
	if err != nil {
		return f, err
	}
	if stat.Mode().IsRegular() {
		f.Type = "f"
	} else if stat.Mode().IsDir() {
		f.Type = "d"
	} else {
		return f, fmt.Errorf("file %s not supported. mode %d\n", f.Path, stat.Mode())
	}
	f.Size = int(stat.Size())
	if unixStat, ok := stat.Sys().(*syscall.Stat_t); ok {
		createdAt := time.Unix(unixStat.Ctimespec.Unix())
		f.CreatedAt = int(createdAt.UTC().Unix())
	} else {
		return f, fmt.Errorf("unable to set createdAt on %s: %s\n", f.Name, reflect.TypeOf(stat.Sys()))
	}

	return f, nil
}

func (e *Explorer) Ls(_ hr, p *Location, r *LsR) error {
	location, err := filepath.Abs(p.Location)
	if err != nil {
		return err
	}
	entries, err := os.ReadDir(location)
	if err != nil {
		return err
	}
	r.Files = append(r.Files, File{
		Name: "..",
		Path: filepath.Clean(path.Join(location, "..")),
		Type: "d",
	})
	for _, e := range entries {
		f, err := NewFile(e, location)
		if err != nil {
			fmt.Printf("NewFile(%s %s): %s\n", e.Name(), location, err)
			continue
		}
		r.Files = append(r.Files, f)
	}
	r.Location = location
	return nil
}

type Explorer struct{}

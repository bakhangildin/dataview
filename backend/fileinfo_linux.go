//go:build linux

package main

import (
	"os"
	"syscall"
	"time"
)

func getCreatedAt(fi os.FileInfo) time.Time {
	if stat, ok := fi.Sys().(*syscall.Stat_t); ok {
		return time.Unix(stat.Ctim.Sec, stat.Ctim.Nsec)
	}
	return time.Time{}
}

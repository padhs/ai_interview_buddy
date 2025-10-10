package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/padhs/ai_interview_buddy/backend/internal/data"
	"github.com/padhs/ai_interview_buddy/backend/internal/services"
)

func main() {
	// Load environment variables from .env file
	// Try multiple possible paths for the .env file
	envPaths := []string{
		"../.env",       // From backend/ directory (where go run is executed)
		"../../../.env", // From backend/cmd/server/
		"../../.env",    // From backend/
		".env",          // Current directory
		"/home/padhs/Desktop/ai_interview_buddy/ai_interview/.env", // Absolute path
	}

	var envLoaded bool
	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			envLoaded = true
			break
		}
	}

	if !envLoaded {
		log.Printf("Warning: Could not load .env file from any of the attempted paths")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required, e.g. postgres://user:pass@localhost:5432/db_name?sslmode=disable")
	}

	pool, err := data.NewPool(dsn)
	if err != nil {
		log.Fatalf("db connect: %v", err)
	}
	defer pool.Close()

	r := services.NewRouter(pool)

	addr := ":8080"
	log.Printf("listening on %s", addr)
	if err := services.Listen(addr, r); err != nil {
		log.Fatal(err)
	}
}

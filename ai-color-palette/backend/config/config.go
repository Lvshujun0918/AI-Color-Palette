package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AIAPIKey     string
	AIAPIBaseURL string
	AIModel      string
	AITimeout    int
}

var AppConfig *Config

func LoadConfig() {
	// 加载.env文件
	if err := godotenv.Load(); err != nil {
		log.Println("[WARNING] .env file not found, using environment variables")
	}

	timeout := 30
	if timeoutStr := os.Getenv("AI_TIMEOUT"); timeoutStr != "" {
		if val, err := strconv.Atoi(timeoutStr); err == nil {
			timeout = val
		}
	}

	AppConfig = &Config{
		AIAPIKey:     os.Getenv("AI_API_KEY"),
		AIAPIBaseURL: getEnvOrDefault("AI_API_BASE_URL", "https://api.openai.com/v1"),
		AIModel:      getEnvOrDefault("AI_MODEL", "gpt-3.5-turbo"),
		AITimeout:    timeout,
	}

	if AppConfig.AIAPIKey == "" {
		log.Println("[ERROR] AI_API_KEY is not set in environment variables")
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	log.Printf("[INFO] %s is not set in environment variables, using default value: %s", key, defaultValue)
	return defaultValue
}

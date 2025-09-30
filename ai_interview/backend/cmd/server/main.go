package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func main() {
	r := gin.Default()
	r.GET("/health", func(c *gin.Context){
		c.JSON(http.StatusOK, gin.H{"message": "Backend is running!"})
	})
	r.Run(":8080") // listen on port 8080
}
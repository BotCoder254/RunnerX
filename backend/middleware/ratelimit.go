package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type visitor struct {
	lastSeen time.Time
	count    int
}

var (
	visitors = make(map[string]*visitor)
	mu       sync.RWMutex
)

const (
	rateLimit  = 100        // requests
	timeWindow = time.Minute // per minute
)

func RateLimiter() gin.HandlerFunc {
	// Cleanup old entries periodically
	go func() {
		for {
			time.Sleep(time.Minute)
			mu.Lock()
			for ip, v := range visitors {
				if time.Since(v.lastSeen) > timeWindow {
					delete(visitors, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()

		mu.Lock()
		v, exists := visitors[ip]
		if !exists {
			visitors[ip] = &visitor{
				lastSeen: time.Now(),
				count:    1,
			}
			mu.Unlock()
			c.Next()
			return
		}

		// Reset count if time window has passed
		if time.Since(v.lastSeen) > timeWindow {
			v.lastSeen = time.Now()
			v.count = 1
			mu.Unlock()
			c.Next()
			return
		}

		// Check rate limit
		if v.count >= rateLimit {
			mu.Unlock()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		v.count++
		v.lastSeen = time.Now()
		mu.Unlock()

		c.Next()
	}
}


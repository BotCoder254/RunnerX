class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.listeners = new Map();
    this.isConnecting = false;
    this.isConnected = false;
    this.pingInterval = null;
    this.connectionTimeout = null;
    this.messageQueue = [];
  }

  connect(token) {
    if (this.isConnecting || this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;
      const wsUrl = process.env.REACT_APP_WS_URL || "ws://localhost:8080/ws";

      // Clear any existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
      }

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          this.handleConnectionError(new Error("Connection timeout"));
          reject(new Error("WebSocket connection timeout"));
        }
      }, 10000); // 10 second timeout

      try {
        this.ws = new WebSocket(`${wsUrl}?token=${token}`);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Clear connection timeout
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }

          // Notify listeners
          this.notifyListeners({ type: "connection:open" });

          // Send initial ping
          this.send({ type: "ping" });

          // Set up ping interval
          this.pingInterval = setInterval(() => {
            if (this.isConnected) {
              this.send({ type: "ping" });
            }
          }, 30000);

          // Send any queued messages
          while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.send(message, false); // Don't queue again
          }

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            // Handle potential multiple JSON objects in one message
            const messages = event.data
              .trim()
              .split("\n")
              .filter((msg) => msg.trim());

            messages.forEach((messageStr) => {
              try {
                const data = JSON.parse(messageStr);
                this.notifyListeners(data);
              } catch (parseError) {
                console.error(
                  "Failed to parse individual WebSocket message:",
                  parseError,
                  "Message:",
                  messageStr,
                );
              }
            });
          } catch (error) {
            console.error(
              "Failed to process WebSocket message:",
              error,
              "Raw data:",
              event.data,
            );
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.handleConnectionError(error);
          if (this.isConnecting) {
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected", event.code, event.reason);
          this.handleConnectionClose();

          // Only attempt reconnect if not a normal closure
          if (event.code !== 1000 && event.code !== 1001) {
            this.attemptReconnect(token);
          }
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
        this.handleConnectionError(error);
        reject(error);
      }
    });
  }

  handleConnectionError(error) {
    this.isConnecting = false;
    this.isConnected = false;

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.notifyListeners({ type: "error", error: error.message });
  }

  handleConnectionClose() {
    this.isConnected = false;
    this.isConnecting = false;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    this.notifyListeners({ type: "connection:close" });
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached.");
      this.notifyListeners({ type: "connection:failed" });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      30000, // Max 30 seconds
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
    );

    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`,
    );

    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect(token).catch((error) => {
          console.error("Reconnection failed:", error);
        });
      }
    }, delay);
  }

  send(data, shouldQueue = true) {
    const message = JSON.stringify(data);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(message);
        return true;
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
        if (shouldQueue) {
          this.messageQueue.push(data);
        }
        return false;
      }
    } else if (shouldQueue) {
      // Queue message for when connection is restored
      this.messageQueue.push(data);
      return false;
    }

    return false;
  }

  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  notifyListeners(data) {
    const { type, ...payload } = data;

    // Notify specific event listeners
    const listeners = this.listeners.get(type);
    if (listeners && listeners.size > 0) {
      listeners.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${type}:`, error);
        }
      });
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners && wildcardListeners.size > 0) {
      wildcardListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error("Error in WebSocket wildcard listener:", error);
        }
      });
    }
  }

  disconnect() {
    console.log("Disconnecting WebSocket...");

    // Clear all timers
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    // Close connection
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    // Reset state
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    // Clear message queue
    this.messageQueue = [];

    // Clear all listeners
    this.listeners.clear();
  }

  // Get current connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
    };
  }
}

export const wsService = new WebSocketService();

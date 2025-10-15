package services

import (
    "log"
    ws "runnerx/websocket"
)

// LogsBroadcaster wraps standard log output to websocket channel
type LogsBroadcaster struct { hub *ws.Hub }

func NewLogsBroadcaster(hub *ws.Hub) *LogsBroadcaster { return &LogsBroadcaster{hub: hub} }

func (lb *LogsBroadcaster) Info(message string, fields map[string]interface{}) {
    payload := map[string]interface{}{"level": "info", "message": message}
    for k, v := range fields { payload[k] = v }
    lb.hub.Broadcast("logs:event", payload)
    log.Println(message)
}

func (lb *LogsBroadcaster) Error(message string, fields map[string]interface{}) {
    payload := map[string]interface{}{"level": "error", "message": message}
    for k, v := range fields { payload[k] = v }
    lb.hub.Broadcast("logs:event", payload)
    log.Println("ERROR:", message)
}



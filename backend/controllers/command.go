package controllers

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "gorm.io/gorm"
    "runnerx/middleware"
    "runnerx/services"
)

type CommandController struct {
    DB            *gorm.DB
    commandService *services.CommandService
}

func NewCommandController(db *gorm.DB, commandService *services.CommandService) *CommandController {
    return &CommandController{
        DB:            db,
        commandService: commandService,
    }
}

// POST /api/commands/execute - Execute a command
func (cc *CommandController) ExecuteCommand(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    
    var req services.CommandRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    req.UserID = userID
    
    response, err := cc.commandService.ExecuteCommand(req)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, response)
}

// GET /api/commands/history - Get command history
func (cc *CommandController) GetCommandHistory(c *gin.Context) {
    userID, _ := middleware.GetUserID(c)
    
    limitStr := c.DefaultQuery("limit", "50")
    limit, err := strconv.Atoi(limitStr)
    if err != nil || limit < 1 || limit > 100 {
        limit = 50
    }
    
    history, err := cc.commandService.GetCommandHistory(userID, limit)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch command history"})
        return
    }
    
    c.JSON(http.StatusOK, history)
}

// GET /api/commands/available - Get available commands
func (cc *CommandController) GetAvailableCommands(c *gin.Context) {
    commands := cc.commandService.GetAvailableCommands()
    c.JSON(http.StatusOK, commands)
}

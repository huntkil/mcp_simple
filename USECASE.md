# MCP Simple - Usage Guide & Examples

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Operations](#basic-operations)
3. [Obsidian Integration](#obsidian-integration)
4. [Google Calendar Integration](#google-calendar-integration)
5. [Bidirectional Sync](#bidirectional-sync)
6. [Smart Features](#smart-features)
7. [Advanced Usage](#advanced-usage)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- Google Cloud Project with Calendar API enabled
- Obsidian vault set up
- PowerShell (for Windows testing)

### Initial Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd mcp_simple
   npm install
   ```

2. **Configure Google Calendar**
   ```bash
   # Create Google Cloud Project
   # Enable Google Calendar API
   # Create OAuth2 credentials
   # Save to config/credentials/google-calendar.json
   ```

3. **Configure Obsidian**
   ```json
   // config/server-config.json
   {
     "port": 8000,
     "obsidianVaultPath": "C:/Users/username/Documents/ObsidianVault",
     "logLevel": "info"
   }
   ```

4. **Build and Start**
   ```bash
   npm run build
   npm start
   ```

5. **Authenticate Google Calendar**
   ```bash
   # Get auth URL
   curl http://localhost:8000/api/calendar/auth-url
   
   # Complete OAuth flow in browser
   # Exchange code for tokens
   curl "http://localhost:8000/api/calendar/auth/callback?code=YOUR_AUTH_CODE"
   ```

## 📝 Basic Operations

### Server Health Check
```bash
# Check server status
curl http://localhost:8000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-07-05T14:58:12.581Z",
  "uptime": 123.45
}
```

### MCP Protocol Testing
```bash
# Initialize MCP connection
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'

# Expected response
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "capabilities": {
      "textDocumentSync": 1,
      "completionProvider": { ... }
    },
    "serverInfo": {
      "name": "MCP Obsidian Server",
      "version": "1.0.0"
    }
  }
}
```

## 📚 Obsidian Integration

### Note Management

#### Get All Notes
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "get_all_notes",
    "params": {
      "limit": 10,
      "includeContent": false,
      "sortBy": "modifiedAt",
      "sortOrder": "desc"
    }
  }'
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "id": "note-1",
      "title": "Meeting Notes",
      "fileName": "Meeting Notes.md",
      "path": "C:/Users/username/Documents/ObsidianVault/Meeting Notes.md",
      "tags": ["meeting", "work"],
      "size": 1024,
      "createdAt": "2024-07-05T10:00:00Z",
      "modifiedAt": "2024-07-05T14:30:00Z"
    }
  ]
}
```

#### Create New Note
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "create_note",
    "params": {
      "title": "Project Planning",
      "content": "# Project Planning\n\n## Goals\n- Complete Phase 1\n- Start Phase 2\n\n## Timeline\n- Week 1: Research\n- Week 2: Implementation",
      "tags": ["project", "planning"],
      "frontmatter": {
        "status": "in-progress",
        "priority": "high"
      }
    }
  }'
```

#### Search Notes
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_notes",
    "params": {
      "query": "project planning",
      "limit": 5,
      "filters": {
        "tags": ["project"],
        "dateRange": {
          "start": "2024-07-01",
          "end": "2024-07-31"
        }
      }
    }
  }'
```

#### Update Note
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "update_note",
    "params": {
      "noteId": "note-1",
      "content": "# Updated Meeting Notes\n\n## New Agenda\n- Review progress\n- Plan next steps",
      "tags": ["meeting", "work", "updated"]
    }
  }'
```

#### Delete Note
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "delete_note",
    "params": {
      "noteId": "note-1"
    }
  }'
```

### Real-time File Watching

The server automatically monitors your Obsidian vault for changes:

```bash
# Server logs show file changes
info: New note detected: C:\Users\username\Documents\ObsidianVault\New Note.md
info: Note updated: C:\Users\username\Documents\ObsidianVault\Updated Note.md
info: Note deleted: C:\Users\username\Documents\ObsidianVault\Deleted Note.md
```

## 📅 Google Calendar Integration

### Event Management

#### Create Calendar Event
```bash
curl -X POST http://localhost:8000/api/calendar/events/create \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Team Meeting",
    "description": "Weekly team sync meeting to discuss project progress",
    "location": "Conference Room A",
    "startDateTime": "2024-07-05T10:00:00Z",
    "endDateTime": "2024-07-05T11:00:00Z",
    "timeZone": "Asia/Seoul",
    "calendarId": "primary",
    "attendees": ["team@company.com"],
    "reminders": {
      "useDefault": false,
      "overrides": [
        {"method": "email", "minutes": 24 * 60},
        {"method": "popup", "minutes": 30}
      ]
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "event-id-123",
    "title": "Team Meeting",
    "description": "Weekly team sync meeting to discuss project progress",
    "startDateTime": "2024-07-05T10:00:00Z",
    "endDateTime": "2024-07-05T11:00:00Z",
    "location": "Conference Room A",
    "htmlLink": "https://calendar.google.com/event?eid=...",
    "status": "confirmed",
    "created": "2024-07-05T09:00:00Z",
    "updated": "2024-07-05T09:00:00Z"
  }
}
```

#### Get Today's Events
```bash
curl http://localhost:8000/api/calendar/today
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "event-1",
      "title": "Morning Standup",
      "startDateTime": "2024-07-05T09:00:00Z",
      "endDateTime": "2024-07-05T09:30:00Z",
      "location": "Zoom Meeting"
    },
    {
      "id": "event-2",
      "title": "Team Meeting",
      "startDateTime": "2024-07-05T10:00:00Z",
      "endDateTime": "2024-07-05T11:00:00Z",
      "location": "Conference Room A"
    }
  ]
}
```

#### Update Event
```bash
curl -X PUT http://localhost:8000/api/calendar/events/event-id-123 \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Updated Team Meeting",
    "description": "Updated meeting description",
    "startDateTime": "2024-07-05T11:00:00Z",
    "endDateTime": "2024-07-05T12:00:00Z"
  }'
```

#### Delete Event
```bash
curl -X DELETE http://localhost:8000/api/calendar/events/event-id-123
```

#### Search Events by Date Range
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "search_calendar_events",
    "params": {
      "timeMin": "2024-07-01T00:00:00Z",
      "timeMax": "2024-07-31T23:59:59Z",
      "query": "meeting",
      "maxResults": 20,
      "orderBy": "startTime"
    }
  }'
```

### Calendar Management

#### Get Calendar List
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "get_calendar_list",
    "params": {}
  }'
```

#### Create New Calendar
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "create_calendar",
    "params": {
      "summary": "Work Projects",
      "description": "Calendar for work-related projects",
      "timeZone": "Asia/Seoul",
      "backgroundColor": "#4285f4",
      "foregroundColor": "#ffffff"
    }
  }'
```

## 🔄 Bidirectional Sync

### Calendar Event to Note

#### Convert Event to Note
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "calendar_to_note",
    "params": {
      "eventId": "event-id-123",
      "noteTitle": "Meeting Notes - Team Sync",
      "includeEventDetails": true,
      "addTags": ["meeting", "work", "calendar"]
    }
  }'
```

**Generated Note Content**:
```markdown
# Meeting Notes - Team Sync

**Event Details:**
- **Date**: July 5, 2024
- **Time**: 10:00 AM - 11:00 AM
- **Location**: Conference Room A
- **Calendar**: Primary Calendar

**Description:**
Weekly team sync meeting to discuss project progress

**Tags**: #meeting #work #calendar

---

## Agenda
[Add your meeting agenda here]

## Notes
[Add your meeting notes here]

## Action Items
- [ ] [Add action items here]

## Follow-up
[Add follow-up items here]
```

### Note to Calendar Event

#### Convert Note to Event
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "note_to_calendar",
    "params": {
      "noteId": "note-1",
      "calendarId": "primary",
      "parseDateTime": true,
      "extractLocation": true
    }
  }'
```

**Note Content Example** (with date/time detection):
```markdown
# Client Meeting

**Date**: 2024-07-10
**Time**: 14:00-15:30
**Location**: Client Office, Downtown

Meeting with client to discuss project requirements and timeline.

## Agenda
1. Project overview
2. Requirements discussion
3. Timeline planning
4. Next steps
```

**Generated Event**:
```json
{
  "success": true,
  "data": {
    "id": "generated-event-id",
    "title": "Client Meeting",
    "description": "Meeting with client to discuss project requirements and timeline.",
    "startDateTime": "2024-07-10T14:00:00Z",
    "endDateTime": "2024-07-10T15:30:00Z",
    "location": "Client Office, Downtown"
  }
}
```

### Bidirectional Synchronization

#### Sync Note with Calendar
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "sync_calendar_note",
    "params": {
      "noteId": "note-1",
      "eventId": "event-id-123",
      "syncDirection": "bidirectional",
      "updateNote": true,
      "updateEvent": true
    }
  }'
```

## 🤖 Smart Features

### Event Classification

#### Classify Event
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "classify_event",
    "params": {
      "eventId": "event-id-123"
    }
  }'
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "event": {
      "id": "event-id-123",
      "title": "Team Meeting",
      "startDateTime": "2024-07-05T10:00:00Z",
      "endDateTime": "2024-07-05T11:00:00Z"
    },
    "classification": {
      "category": "meeting",
      "priority": "medium",
      "tags": ["team", "sync", "work"],
      "confidence": 0.85
    }
  }
}
```

### Conflict Detection

#### Detect Schedule Conflicts
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "detect_conflicts",
    "params": {
      "timeMin": "2024-07-05T00:00:00Z",
      "timeMax": "2024-07-06T00:00:00Z",
      "includeRecommendations": true
    }
  }'
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "period": {
      "startDate": "2024-07-05T00:00:00Z",
      "endDate": "2024-07-06T00:00:00Z"
    },
    "totalEvents": 5,
    "conflictDetection": {
      "conflictingEvents": [
        {
          "event1": {
            "id": "event-1",
            "title": "Team Meeting",
            "start": "2024-07-05T10:00:00Z",
            "end": "2024-07-05T11:00:00Z"
          },
          "event2": {
            "id": "event-2",
            "title": "Client Call",
            "start": "2024-07-05T10:30:00Z",
            "end": "2024-07-05T11:30:00Z"
          },
          "overlapDuration": 30
        }
      ],
      "recommendations": [
        {
          "type": "reschedule",
          "eventId": "event-2",
          "suggestedTime": "2024-07-05T11:00:00Z",
          "reason": "Avoid overlap with Team Meeting"
        }
      ]
    }
  }
}
```

### AI Recommendations

#### Generate Scheduling Recommendations
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "generate_recommendations",
    "params": {
      "timeMin": "2024-07-01T00:00:00Z",
      "timeMax": "2024-07-31T23:59:59Z",
      "includeTimeManagement": true,
      "includeProductivityTips": true
    }
  }'
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "period": {
      "startDate": "2024-07-01T00:00:00Z",
      "endDate": "2024-07-31T23:59:59Z"
    },
    "totalEvents": 45,
    "recommendations": [
      {
        "type": "time_management",
        "title": "Optimize Morning Schedule",
        "description": "You have 3 meetings scheduled before 10 AM. Consider grouping them or adding breaks.",
        "priority": "high",
        "actionable": true,
        "suggestedActions": [
          "Move non-urgent meetings to afternoon",
          "Add 15-minute breaks between meetings",
          "Prepare agenda items in advance"
        ]
      },
      {
        "type": "productivity",
        "title": "Focus Time Allocation",
        "description": "Only 20% of your time is allocated to focused work. Consider blocking dedicated focus time.",
        "priority": "medium",
        "actionable": true,
        "suggestedActions": [
          "Block 2-hour focus sessions",
          "Turn off notifications during focus time",
          "Schedule focus time in your calendar"
        ]
      }
    ]
  }
}
```

### Automated Reminders

#### Generate Smart Reminders
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "generate_automated_reminders",
    "params": {
      "eventId": "event-id-123",
      "includePreparation": true,
      "includeTravel": true,
      "includeFollowUp": true
    }
  }'
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "event": {
      "id": "event-id-123",
      "title": "Client Presentation",
      "startDateTime": "2024-07-05T14:00:00Z",
      "endDateTime": "2024-07-05T15:00:00Z"
    },
    "reminders": [
      {
        "type": "preparation",
        "title": "Prepare Presentation Materials",
        "time": "2024-07-05T13:00:00Z",
        "description": "Review and finalize presentation slides"
      },
      {
        "type": "travel",
        "title": "Leave for Client Office",
        "time": "2024-07-05T13:30:00Z",
        "description": "Estimated travel time: 30 minutes"
      },
      {
        "type": "follow_up",
        "title": "Send Meeting Summary",
        "time": "2024-07-05T16:00:00Z",
        "description": "Send meeting notes and action items to client"
      }
    ]
  }
}
```

### Productivity Insights

#### Generate Analytics
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "generate_productivity_insights",
    "params": {
      "timeMin": "2024-07-01T00:00:00Z",
      "timeMax": "2024-07-31T23:59:59Z",
      "includeTrends": true,
      "includeRecommendations": true
    }
  }'
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "period": {
      "startDate": "2024-07-01T00:00:00Z",
      "endDate": "2024-07-31T23:59:59Z"
    },
    "insights": {
      "totalEvents": 45,
      "workEvents": 35,
      "personalEvents": 10,
      "averageEventDuration": 60,
      "busyDays": [
        {
          "date": "2024-07-15",
          "eventCount": 8,
          "totalDuration": 480
        }
      ],
      "freeTimeSlots": [
        {
          "date": "2024-07-05",
          "startTime": "2024-07-05T00:00:00Z",
          "endTime": "2024-07-05T09:00:00Z",
          "duration": 540
        }
      ],
      "recommendations": [
        {
          "type": "time_management",
          "title": "Optimize Busy Days",
          "description": "July 15th has 8 events. Consider rescheduling non-urgent items.",
          "priority": "high",
          "actionable": true,
          "suggestedActions": [
            "Move 2-3 non-critical meetings",
            "Add buffer time between events",
            "Prepare materials in advance"
          ]
        }
      ]
    }
  }
}
```

## 🔧 Advanced Usage

### Smart Features Configuration

#### Get Current Configuration
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "get_smart_features_config",
    "params": {}
  }'
```

#### Update Configuration
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "update_smart_features_config",
    "params": {
      "enableClassification": true,
      "enableConflictDetection": true,
      "enableAIRecommendations": true,
      "classificationThreshold": 0.8,
      "conflictDetectionRange": 60,
      "reminderDefaults": {
        "preparation": 120,
        "travel": 45,
        "followUp": 30
      }
    }
  }'
```

### Batch Operations

#### Create Multiple Events
```bash
# Create multiple events in a loop
for i in {1..5}; do
  curl -X POST http://localhost:8000/api/calendar/events/create \
    -H "Content-Type: application/json" \
    -d "{
      \"summary\": \"Meeting $i\",
      \"startDateTime\": \"2024-07-0${i}T10:00:00Z\",
      \"endDateTime\": \"2024-07-0${i}T11:00:00Z\"
    }"
done
```

#### Bulk Note Operations
```bash
# Get all notes and process them
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "get_all_notes",
    "params": {"includeContent": true}
  }' | jq '.result[] | select(.tags[] | contains("meeting")) | .id'
```

### Integration Examples

#### PowerShell Script for Daily Check
```powershell
# daily-check.ps1
Write-Host "=== Daily Schedule Check ===" -ForegroundColor Green

# Get today's events
$events = Invoke-RestMethod -Uri "http://localhost:8000/api/calendar/today"
Write-Host "Today's Events: $($events.data.Count)" -ForegroundColor Yellow

# Check for conflicts
$conflicts = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "detect_conflicts",
  "params": {
    "timeMin": "' + (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ") + '",
    "timeMax": "' + (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ssZ") + '"
  }
}'

if ($conflicts.result.conflictDetection.conflictingEvents.Count -gt 0) {
    Write-Host "⚠️  Conflicts detected!" -ForegroundColor Red
    $conflicts.result.conflictDetection.conflictingEvents | ForEach-Object {
        Write-Host "  - $($_.event1.title) conflicts with $($_.event2.title)" -ForegroundColor Red
    }
} else {
    Write-Host "✅ No conflicts detected" -ForegroundColor Green
}

# Get productivity insights
$insights = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "generate_productivity_insights",
  "params": {
    "timeMin": "' + (Get-Date).AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ssZ") + '",
    "timeMax": "' + (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ") + '"
  }
}'

Write-Host "`n📊 Weekly Insights:" -ForegroundColor Cyan
Write-Host "  Total Events: $($insights.result.insights.totalEvents)" -ForegroundColor White
Write-Host "  Work Events: $($insights.result.insights.workEvents)" -ForegroundColor White
Write-Host "  Personal Events: $($insights.result.insights.personalEvents)" -ForegroundColor White
```

#### Python Integration Example
```python
import requests
import json
from datetime import datetime, timedelta

class MCPSimpleClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
    
    def call_mcp(self, method, params=None):
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": method,
            "params": params or {}
        }
        response = requests.post(f"{self.base_url}/mcp", json=payload)
        return response.json()
    
    def get_today_events(self):
        response = requests.get(f"{self.base_url}/api/calendar/today")
        return response.json()
    
    def create_meeting_note(self, event_id, title):
        return self.call_mcp("calendar_to_note", {
            "eventId": event_id,
            "noteTitle": title,
            "includeEventDetails": True,
            "addTags": ["meeting", "auto-generated"]
        })
    
    def analyze_schedule(self, days=7):
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        return self.call_mcp("generate_productivity_insights", {
            "timeMin": start_date.isoformat() + "Z",
            "timeMax": end_date.isoformat() + "Z"
        })

# Usage
client = MCPSimpleClient()

# Get today's schedule
events = client.get_today_events()
print(f"Today's events: {len(events['data'])}")

# Create notes for all meetings
for event in events['data']:
    if 'meeting' in event['title'].lower():
        note = client.create_meeting_note(event['id'], f"Notes - {event['title']}")
        print(f"Created note: {note['result']['note']['title']}")

# Analyze productivity
insights = client.analyze_schedule()
print(f"Weekly insights: {insights['result']['insights']['totalEvents']} events")
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Issues
**Problem**: "No access, refresh token, API key or refresh handler callback is set"

**Solution**:
```bash
# Check if tokens exist
ls config/credentials/google-calendar-tokens.json

# If not exists, re-authenticate
curl http://localhost:8000/api/calendar/auth-url
# Follow OAuth flow in browser
curl "http://localhost:8000/api/calendar/auth/callback?code=YOUR_CODE"
```

#### 2. Obsidian Vault Access
**Problem**: Cannot read Obsidian vault

**Solution**:
```bash
# Check vault path
cat config/server-config.json | jq '.obsidianVaultPath'

# Verify directory exists and has permissions
ls -la "C:/Users/username/Documents/ObsidianVault"

# Restart server after fixing path
npm start
```

#### 3. Port Conflicts
**Problem**: "EADDRINUSE: address already in use"

**Solution**:
```bash
# Kill existing processes
taskkill /F /IM node.exe

# Or change port in config
# Edit config/server-config.json: "port": 8001
```

#### 4. File Watching Issues
**Problem**: File changes not detected

**Solution**:
```bash
# Check file watcher status in logs
# Look for "File watcher ready" message

# Restart file watcher
# Restart server: npm start
```

### Debug Mode

Enable detailed logging:
```json
// config/server-config.json
{
  "logLevel": "debug"
}
```

Check logs for detailed information:
```bash
# Monitor logs in real-time
tail -f logs/combined.log

# Filter for specific errors
grep "error" logs/combined.log
```

## 📋 Best Practices

### 1. Note Organization
- Use consistent naming conventions
- Add relevant tags to all notes
- Include frontmatter for metadata
- Regular backup of your Obsidian vault

### 2. Calendar Management
- Use descriptive event titles
- Include detailed descriptions
- Set appropriate reminders
- Use calendar colors for categorization

### 3. Smart Features Usage
- Regularly review AI recommendations
- Address conflicts promptly
- Use productivity insights for planning
- Customize smart features configuration

### 4. Performance Optimization
- Limit large date ranges in queries
- Use pagination for large result sets
- Cache frequently accessed data
- Monitor server performance

### 5. Security
- Keep credentials secure
- Regularly rotate OAuth tokens
- Use HTTPS in production
- Monitor access logs

---

This usage guide provides comprehensive examples and practical scenarios for using MCP Simple. For technical details and implementation information, refer to `project_doc.md`. 
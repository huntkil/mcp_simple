# MCP Simple - Obsidian & Google Calendar Integration

A powerful Node.js/TypeScript server that integrates Obsidian note management with Google Calendar, featuring AI-powered smart scheduling capabilities.

## 🚀 Features

### 📝 **Obsidian Integration**
- **Note Management**: Create, read, update, delete notes
- **Search & Filter**: Advanced search with relevance scoring
- **File Watching**: Real-time vault monitoring
- **Tag Support**: Automatic tag extraction and management

### 📅 **Google Calendar Integration**
- **OAuth2 Authentication**: Secure Google Calendar access
- **Event Management**: Create, update, delete calendar events
- **Calendar Operations**: List calendars, search events by date range
- **Token Persistence**: Automatic token refresh and storage

### 🔄 **Bidirectional Sync**
- **Calendar → Note**: Convert calendar events to Obsidian notes
- **Note → Calendar**: Transform notes with date/time info into events
- **Smart Parsing**: Automatic date/time detection from note content
- **Tag-based Linking**: Connect notes and events via tags

### 🤖 **AI-Powered Smart Features**
- **Event Classification**: AI-based categorization and priority assignment
- **Conflict Detection**: Automatic schedule conflict identification
- **AI Recommendations**: Intelligent time management suggestions
- **Automated Reminders**: Smart notification generation
- **Productivity Insights**: Detailed analytics and statistics

## 🛠 Tech Stack

- **Backend**: Node.js, TypeScript
- **Framework**: Express.js
- **Authentication**: Google OAuth2
- **APIs**: Google Calendar API, MCP Protocol
- **File System**: Node.js fs module
- **Logging**: Winston logger

## 📁 Project Structure

```
mcp_simple/
├── src/
│   ├── connectors/          # External service connectors
│   │   ├── google-calendar-connector.ts
│   │   └── obsidian-connector.ts
│   ├── server/              # Server implementation
│   │   ├── mcp-server.ts    # Main server
│   │   ├── protocol-handler.ts
│   │   ├── message-handler.ts
│   │   └── google-calendar-demo.ts
│   ├── services/            # Business logic services
│   │   ├── ai-service.ts
│   │   ├── search-service.ts
│   │   └── smart-features-service.ts
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── config/                  # Configuration files
│   └── credentials/
├── dist/                    # Compiled JavaScript
└── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Google Cloud Project with Calendar API enabled
- Obsidian vault

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp_simple
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Google Calendar**
   - Create a Google Cloud Project
   - Enable Google Calendar API
   - Create OAuth2 credentials
   - Save credentials to `config/credentials/google-calendar.json`

4. **Configure Obsidian**
   - Set your Obsidian vault path in `config/server-config.json`

5. **Build and start**
   ```bash
   npm run build
   npm start
   ```

## 🔧 Configuration

### Google Calendar Setup
```json
// config/credentials/google-calendar.json
{
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "redirectUri": "http://localhost:8000/api/calendar/auth/callback"
}
```

### Server Configuration
```json
// config/server-config.json
{
  "port": 8000,
  "obsidianVaultPath": "C:/Users/username/Documents/ObsidianVault",
  "logLevel": "info"
}
```

## 📡 API Endpoints

### MCP Protocol Endpoints
- `POST /mcp` - Main MCP protocol endpoint

### REST API Endpoints
- `GET /health` - Health check
- `GET /api/calendar/status` - Calendar authentication status
- `GET /api/calendar/auth-url` - OAuth authorization URL
- `GET /api/calendar/today` - Today's events
- `POST /api/calendar/events/create` - Create event
- `PUT /api/calendar/events/:id` - Update event
- `DELETE /api/calendar/events/:id` - Delete event

## 🎯 Usage Examples

### 1. Basic Note Operations
```bash
# Get all notes
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "get_all_notes", "params": {}}'

# Create a new note
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "create_note", "params": {"title": "Meeting Notes", "content": "Team sync meeting"}}'
```

### 2. Calendar Operations
```bash
# Create calendar event
curl -X POST http://localhost:8000/api/calendar/events/create \
  -H "Content-Type: application/json" \
  -d '{"summary": "Team Meeting", "startDateTime": "2024-07-05T10:00:00Z", "endDateTime": "2024-07-05T11:00:00Z"}'

# Get today's events
curl http://localhost:8000/api/calendar/today
```

### 3. Smart Features
```bash
# Classify an event
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "classify_event", "params": {"eventId": "event-id"}}'

# Detect conflicts
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "detect_conflicts", "params": {"timeMin": "2024-07-05T00:00:00Z", "timeMax": "2024-07-06T00:00:00Z"}}'
```

### 4. Bidirectional Sync
```bash
# Convert calendar event to note
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "calendar_to_note", "params": {"eventId": "event-id"}}'

# Convert note to calendar event
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "note_to_calendar", "params": {"noteId": "note-id"}}'
```

## 🔐 Authentication

1. **Get authorization URL**
   ```bash
   curl http://localhost:8000/api/calendar/auth-url
   ```

2. **Complete OAuth flow**
   - Open the URL in browser
   - Grant permissions
   - Copy the authorization code

3. **Exchange code for tokens**
   ```bash
   curl "http://localhost:8000/api/calendar/auth/callback?code=YOUR_AUTH_CODE"
   ```

## 📊 Smart Features

### Event Classification
- **Categories**: work, personal, meeting, appointment, task, other
- **Priority Levels**: high, medium, low
- **Confidence Scoring**: AI-based classification accuracy

### Conflict Detection
- **Time Overlap Detection**: Identifies conflicting events
- **Recommendations**: Suggests alternative times
- **Conflict Resolution**: Automated rescheduling suggestions

### AI Recommendations
- **Time Management**: Optimize daily schedule
- **Productivity Tips**: Based on event patterns
- **Work-Life Balance**: Personal vs work time analysis

### Productivity Insights
- **Event Statistics**: Total events, categories, duration
- **Time Analysis**: Busy days, free time slots
- **Trends**: Weekly/monthly patterns
- **Recommendations**: Actionable improvements

## 🧪 Testing

Run the comprehensive test suite:
```bash
# Test all features
.\test-phase3.ps1

# Test specific functionality
curl http://localhost:8000/health
curl http://localhost:8000/api/calendar/status
```

## 🔧 Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Type Checking
```bash
npm run type-check
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation in `project_doc.md`
- Review usage examples in `usecase.md`

---

**MCP Simple** - Making calendar management intelligent and seamless! 🚀 
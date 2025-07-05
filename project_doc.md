# MCP Simple - Technical Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [API Reference](#api-reference)
5. [Implementation Details](#implementation-details)
6. [Configuration](#configuration)
7. [Development Guide](#development-guide)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

## 🎯 Project Overview

MCP Simple is a comprehensive Node.js/TypeScript server that integrates Obsidian note management with Google Calendar, featuring AI-powered smart scheduling capabilities. The project implements the Model Context Protocol (MCP) for seamless integration with AI development environments.

### Key Features

- **Obsidian Integration**: Full CRUD operations for markdown notes
- **Google Calendar Sync**: OAuth2-based calendar management
- **Bidirectional Sync**: Convert between notes and calendar events
- **AI-Powered Smart Features**: Classification, conflict detection, recommendations
- **Real-time File Watching**: Automatic vault monitoring
- **MCP Protocol Support**: JSON-RPC communication

## 🏗 Architecture

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │    │   Web Browser   │    │   Mobile App    │
│   (Cursor AI)   │    │                 │    │                 │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │    MCP Simple Server      │
                    │   (Express.js + TypeScript)│
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌─────────▼─────────┐
│  Obsidian Vault   │  │ Google Calendar   │  │   File System     │
│   (Local Files)   │  │     (OAuth2)      │  │   (Config/Logs)   │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

### Component Architecture

```
src/
├── server/                    # Server layer
│   ├── mcp-server.ts         # Main Express server
│   ├── protocol-handler.ts   # MCP protocol implementation
│   ├── message-handler.ts    # Message routing
│   └── google-calendar-demo.ts # REST API endpoints
├── connectors/               # External service connectors
│   ├── obsidian-connector.ts # Obsidian vault integration
│   └── google-calendar-connector.ts # Google Calendar API
├── services/                 # Business logic layer
│   ├── ai-service.ts         # AI/ML functionality
│   ├── search-service.ts     # Search and indexing
│   └── smart-features-service.ts # Smart scheduling features
├── types/                    # TypeScript type definitions
│   ├── mcp-types.ts         # MCP protocol types
│   ├── obsidian-types.ts    # Obsidian data types
│   └── google-calendar-types.ts # Calendar API types
└── utils/                    # Utility functions
    ├── file-watcher.ts      # File system monitoring
    ├── markdown-parser.ts   # Markdown processing
    └── logger.ts            # Logging utilities
```

## 🔧 Core Components

### 1. MCP Server (`src/server/mcp-server.ts`)

**Purpose**: Main Express server that handles HTTP requests and MCP protocol communication.

**Key Features**:
- Express.js server setup with middleware
- MCP protocol endpoint (`/mcp`)
- REST API endpoints for Google Calendar
- Health check endpoint
- CORS configuration
- Error handling middleware

**Implementation**:
```typescript
const app = express();
app.use(express.json());
app.use(cors());

// MCP Protocol endpoint
app.post('/mcp', async (req, res) => {
  const response = await handleMCPMessage(req.body);
  res.json(response);
});

// REST API endpoints
app.use('/api/calendar', calendarRouter);
```

### 2. Protocol Handler (`src/server/protocol-handler.ts`)

**Purpose**: Implements MCP protocol methods and business logic.

**Implemented Methods**:

#### Basic MCP Methods
- `initialize`: Server initialization and capability discovery
- `shutdown`: Graceful server shutdown
- `exit`: Process termination

#### Obsidian Methods
- `get_all_notes`: Retrieve all notes with filtering and sorting
- `get_recent_notes`: Get recently modified notes
- `search_notes`: Full-text search with relevance scoring
- `get_note`: Retrieve specific note by ID
- `create_note`: Create new note with metadata
- `update_note`: Update existing note content and metadata
- `delete_note`: Remove note from vault

#### Calendar Integration Methods
- `search_calendar_events`: Search events by date range and criteria
- `calendar_to_note`: Convert calendar event to Obsidian note
- `note_to_calendar`: Convert note with date/time to calendar event
- `sync_calendar_note`: Bidirectional synchronization

#### Smart Features Methods
- `classify_event`: AI-based event categorization
- `detect_conflicts`: Schedule conflict detection
- `generate_recommendations`: AI-powered scheduling recommendations
- `generate_automated_reminders`: Smart reminder generation
- `generate_productivity_insights`: Analytics and insights
- `update_smart_features_config`: Configuration management
- `get_smart_features_config`: Retrieve current settings

### 3. Obsidian Connector (`src/connectors/obsidian-connector.ts`)

**Purpose**: Manages Obsidian vault operations and file system interactions.

**Key Features**:
- Vault scanning and indexing
- Real-time file watching
- Markdown parsing and metadata extraction
- CRUD operations for notes
- Tag and frontmatter management
- Backlink processing

**Implementation**:
```typescript
export class ObsidianConnector {
  private vaultPath: string;
  private notes: Map<string, ObsidianNote>;
  private fileWatcher: any;

  async initialize(): Promise<void> {
    await this.scanVault();
    this.startFileWatcher();
  }

  getAllNotes(): ObsidianNote[] {
    return Array.from(this.notes.values());
  }

  async createNote(title: string, content: string): Promise<ObsidianNote> {
    // Implementation for note creation
  }
}
```

### 4. Google Calendar Connector (`src/connectors/google-calendar-connector.ts`)

**Purpose**: Handles Google Calendar API interactions and OAuth2 authentication.

**Key Features**:
- OAuth2 authentication flow
- Token management and refresh
- Calendar event CRUD operations
- Calendar list management
- Error handling and retry logic

**Implementation**:
```typescript
export class GoogleCalendarConnector {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor(config: GoogleCalendarConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async createEvent(eventData: CalendarEventInput): Promise<CalendarServiceResponse<CalendarEventOutput>> {
    // Implementation for event creation
  }
}
```

### 5. Smart Features Service (`src/services/smart-features-service.ts`)

**Purpose**: Implements AI-powered scheduling features and analytics.

**Key Features**:
- Event classification using AI
- Conflict detection algorithms
- Recommendation generation
- Productivity analytics
- Automated reminder creation

**Implementation**:
```typescript
export class SmartFeaturesService {
  private config: SmartFeaturesConfig;

  async classifyEvent(eventId: string): Promise<EventClassification> {
    // AI-based event classification
  }

  async detectConflicts(timeMin: string, timeMax: string): Promise<ConflictDetection> {
    // Schedule conflict detection
  }

  async generateRecommendations(timeMin: string, timeMax: string): Promise<AIRecommendation[]> {
    // AI-powered recommendations
  }
}
```

## 📡 API Reference

### MCP Protocol Endpoints

#### POST `/mcp`
Main MCP protocol endpoint for all method calls.

**Request Format**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": {}
}
```

**Response Format**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {},
  "error": null
}
```

### REST API Endpoints

#### Health Check
- **GET** `/health`
- **Response**: Server status and uptime

#### Google Calendar API
- **GET** `/api/calendar/status` - Authentication status
- **GET** `/api/calendar/auth-url` - OAuth authorization URL
- **GET** `/api/calendar/today` - Today's events
- **POST** `/api/calendar/events/create` - Create event
- **PUT** `/api/calendar/events/:id` - Update event
- **DELETE** `/api/calendar/events/:id` - Delete event

## 🔧 Implementation Details

### Authentication Flow

1. **OAuth2 Setup**:
   ```typescript
   const oauth2Client = new google.auth.OAuth2(
     config.clientId,
     config.clientSecret,
     config.redirectUri
   );
   ```

2. **Token Management**:
   ```typescript
   // Load existing tokens
   if (fs.existsSync(tokenPath)) {
     const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
     oauth2Client.setCredentials(tokens);
   }
   ```

3. **Token Refresh**:
   ```typescript
   async refreshAccessToken(): Promise<CalendarServiceResponse<any>> {
     const { credentials } = await this.oauth2Client.refreshAccessToken();
     this.oauth2Client.setCredentials(credentials);
     return { success: true, data: credentials };
   }
   ```

### File Watching Implementation

```typescript
export class FileWatcher {
  private watcher: any;
  private vaultPath: string;
  private onNoteAdded: (path: string) => void;
  private onNoteChanged: (path: string) => void;
  private onNoteDeleted: (path: string) => void;

  startWatching(): void {
    this.watcher = chokidar.watch(this.vaultPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    this.watcher
      .on('add', this.onNoteAdded)
      .on('change', this.onNoteChanged)
      .on('unlink', this.onNoteDeleted);
  }
}
```

### Smart Features Implementation

#### Event Classification
```typescript
async classifyEvent(eventId: string): Promise<EventClassification> {
  const event = await this.getEvent(eventId);
  
  // AI-based classification logic
  const category = this.analyzeEventContent(event.summary, event.description);
  const priority = this.determinePriority(event);
  const confidence = this.calculateConfidence(event);
  
  return {
    category,
    priority,
    confidence,
    tags: this.extractTags(event)
  };
}
```

#### Conflict Detection
```typescript
async detectConflicts(timeMin: string, timeMax: string): Promise<ConflictDetection> {
  const events = await this.getEvents({ timeMin, timeMax });
  const conflicts = this.findTimeOverlaps(events);
  
  return {
    conflictingEvents: conflicts,
    recommendations: this.generateConflictResolutions(conflicts)
  };
}
```

## ⚙️ Configuration

### Server Configuration (`config/server-config.json`)
```json
{
  "port": 8000,
  "obsidianVaultPath": "C:/Users/username/Documents/ObsidianVault",
  "logLevel": "info",
  "enableFileWatcher": true,
  "maxFileSize": 10485760,
  "ignorePatterns": [
    ".obsidian/**",
    "*.temp",
    "*.tmp"
  ]
}
```

### Google Calendar Configuration (`config/credentials/google-calendar.json`)
```json
{
  "clientId": "your-google-client-id",
  "clientSecret": "your-google-client-secret",
  "redirectUri": "http://localhost:8000/api/calendar/auth/callback"
}
```

### Smart Features Configuration
```json
{
  "enableClassification": true,
  "enableConflictDetection": true,
  "enableAIRecommendations": true,
  "enableAutomatedReminders": true,
  "enableProductivityInsights": true,
  "classificationThreshold": 0.7,
  "conflictDetectionRange": 30,
  "reminderDefaults": {
    "preparation": 60,
    "travel": 30,
    "followUp": 15
  }
}
```

## 🛠 Development Guide

### Adding New MCP Methods

1. **Define Method Type** (`src/types/mcp-types.ts`):
   ```typescript
   export interface NewMethodParams {
     param1: string;
     param2: number;
   }
   
   export interface NewMethodResult {
     success: boolean;
     data: any;
   }
   ```

2. **Implement Handler** (`src/server/protocol-handler.ts`):
   ```typescript
   export async function handleNewMethod(params: NewMethodParams): Promise<NewMethodResult> {
     try {
       // Implementation logic
       return {
         success: true,
         data: result
       };
     } catch (error) {
       throw createMCPError(-32603, 'Internal error', error);
     }
   }
   ```

3. **Register Method** (`src/server/protocol-handler.ts`):
   ```typescript
   registerMethodHandler('new_method', handleNewMethod);
   ```

### Adding New Connectors

1. **Create Connector Class**:
   ```typescript
   export class NewServiceConnector {
     constructor(config: NewServiceConfig) {
       // Initialize connection
     }
   
     async connect(): Promise<void> {
       // Establish connection
     }
   
     async disconnect(): Promise<void> {
       // Clean up connection
     }
   }
   ```

2. **Add to Server Initialization**:
   ```typescript
   const newServiceConnector = new NewServiceConnector(config);
   await newServiceConnector.connect();
   ```

### Error Handling

```typescript
export function createMCPError(code: number, message: string, data?: any): MCPError {
  return {
    code,
    message,
    data
  };
}

// Usage in handlers
try {
  // Operation logic
} catch (error) {
  throw createMCPError(-32603, 'Internal server error', error);
}
```

## 🧪 Testing

### Unit Testing
```bash
npm test
```

### Integration Testing
```bash
# Test all features
.\test-phase3.ps1

# Test specific endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/calendar/status
```

### Manual Testing

#### Test Note Operations
```bash
# Get all notes
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "get_all_notes", "params": {}}'

# Create note
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "create_note", "params": {"title": "Test Note", "content": "Test content"}}'
```

#### Test Calendar Operations
```bash
# Create event
curl -X POST http://localhost:8000/api/calendar/events/create \
  -H "Content-Type: application/json" \
  -d '{"summary": "Test Event", "startDateTime": "2024-07-05T10:00:00Z", "endDateTime": "2024-07-05T11:00:00Z"}'

# Get today's events
curl http://localhost:8000/api/calendar/today
```

#### Test Smart Features
```bash
# Classify event
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "classify_event", "params": {"eventId": "event-id"}}'

# Detect conflicts
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "detect_conflicts", "params": {"timeMin": "2024-07-05T00:00:00Z", "timeMax": "2024-07-06T00:00:00Z"}}'
```

## 🚀 Deployment

### Development Deployment
```bash
npm install
npm run build
npm start
```

### Production Deployment

1. **Environment Setup**:
   ```bash
   export NODE_ENV=production
   export PORT=8000
   export OBSIDIAN_VAULT_PATH=/path/to/vault
   ```

2. **Process Management**:
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start dist/server/mcp-server.js --name mcp-simple
   pm2 save
   pm2 startup
   ```

3. **Reverse Proxy** (Nginx):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Docker Deployment
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY config ./config

EXPOSE 8000

CMD ["node", "dist/server/mcp-server.js"]
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Google Calendar Authentication Errors
**Problem**: "No access, refresh token, API key or refresh handler callback is set"

**Solution**:
- Check if `google-calendar-tokens.json` exists in `config/credentials/`
- Re-authenticate using OAuth flow
- Verify client ID and secret in configuration

#### 2. Obsidian Vault Access Issues
**Problem**: Cannot read Obsidian vault

**Solution**:
- Verify vault path in `server-config.json`
- Check file permissions
- Ensure vault directory exists

#### 3. Port Conflicts
**Problem**: "EADDRINUSE: address already in use"

**Solution**:
- Kill existing Node.js processes: `taskkill /F /IM node.exe`
- Change port in configuration
- Check for other services using the port

#### 4. File Watching Issues
**Problem**: File changes not detected

**Solution**:
- Verify file watcher is enabled in configuration
- Check file system permissions
- Restart the server

### Debug Mode

Enable debug logging:
```json
{
  "logLevel": "debug"
}
```

### Log Analysis

Logs are stored in structured JSON format:
```json
{
  "level": "info",
  "message": "Server started",
  "timestamp": "2024-07-05T14:58:12.581Z",
  "service": "mcp-server"
}
```

### Performance Monitoring

Monitor server performance:
```bash
# Check memory usage
node --inspect dist/server/mcp-server.js

# Monitor with PM2
pm2 monit
```

---

This documentation provides comprehensive technical details for the MCP Simple project. For usage examples and practical applications, refer to `usecase.md`. 
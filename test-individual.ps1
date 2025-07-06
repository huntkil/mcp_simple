# Individual Test Functions

function Test-MCPInitialization {
    Write-Host "Testing MCP Initialization..." -ForegroundColor Cyan
    try {
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "initialize"
            params = @{}
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $body
        Write-Host "✅ MCP Initialization: $($response.result.serverInfo.name)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ MCP Initialization Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ObsidianNotes {
    Write-Host "Testing Obsidian Notes..." -ForegroundColor Cyan
    try {
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "get_all_notes"
            params = @{
                limit = 5
                includeContent = $false
            }
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $body
        Write-Host "✅ Obsidian Notes: $($response.result.Count) notes found" -ForegroundColor Green
        return $response.result
    } catch {
        Write-Host "❌ Obsidian Notes Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Test-CreateNote {
    Write-Host "Testing Create Note..." -ForegroundColor Cyan
    try {
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "create_note"
            params = @{
                title = "Test Note $(Get-Date -Format 'HHmmss')"
                content = "# Test Note`nCreated at $(Get-Date)`n`nThis is a test note for comprehensive testing."
                tags = @("test", "comprehensive")
            }
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $body
        Write-Host "✅ Create Note: $($response.result.note.title)" -ForegroundColor Green
        return $response.result.note.id
    } catch {
        Write-Host "❌ Create Note Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Test-GoogleCalendarStatus {
    Write-Host "Testing Google Calendar Status..." -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/calendar/status" -Method GET
        Write-Host "✅ Google Calendar Status: $($response.status)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Google Calendar Status Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-CreateCalendarEvent {
    Write-Host "Testing Create Calendar Event..." -ForegroundColor Cyan
    try {
        $body = @{
            summary = "Test Event $(Get-Date -Format 'HHmmss')"
            description = "Test event for comprehensive testing"
            startDateTime = (Get-Date).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ssZ")
            endDateTime = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ")
            location = "Test Location"
            timeZone = "Asia/Seoul"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/calendar/events/create" -Method POST -ContentType "application/json" -Body $body
        Write-Host "✅ Create Calendar Event: $($response.data.title)" -ForegroundColor Green
        return $response.data.id
    } catch {
        Write-Host "❌ Create Calendar Event Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

function Test-SmartFeatures {
    Write-Host "Testing Smart Features..." -ForegroundColor Cyan
    try {
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "generate_recommendations"
            params = @{
                timeMin = (Get-Date).AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ssZ")
                timeMax = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ssZ")
                includeTimeManagement = $true
                includeProductivityTips = $true
            }
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $body
        Write-Host "✅ Smart Features: $($response.result.recommendations.Count) recommendations" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Smart Features Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-BidirectionalSync {
    param($noteId, $eventId)
    Write-Host "Testing Bidirectional Sync..." -ForegroundColor Cyan
    try {
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "calendar_to_note"
            params = @{
                eventId = $eventId
                noteTitle = "Sync Test Note"
                includeEventDetails = $true
                addTags = @("sync", "test")
            }
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $body
        Write-Host "✅ Bidirectional Sync: $($response.result.note.title)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ Bidirectional Sync Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Run all tests
Write-Host "=== Individual Feature Tests ===" -ForegroundColor Green

$mcpInit = Test-MCPInitialization
$notes = Test-ObsidianNotes
$noteId = Test-CreateNote
$calendarStatus = Test-GoogleCalendarStatus
$eventId = Test-CreateCalendarEvent
$smartFeatures = Test-SmartFeatures

if ($eventId) {
    $sync = Test-BidirectionalSync -noteId $noteId -eventId $eventId
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Green
Write-Host "MCP Initialization: $(if($mcpInit){'✅'}else{'❌'})" -ForegroundColor $(if($mcpInit){'Green'}else{'Red'})
Write-Host "Obsidian Notes: $(if($notes){'✅'}else{'❌'})" -ForegroundColor $(if($notes){'Green'}else{'Red'})
Write-Host "Create Note: $(if($noteId){'✅'}else{'❌'})" -ForegroundColor $(if($noteId){'Green'}else{'Red'})
Write-Host "Google Calendar Status: $(if($calendarStatus){'✅'}else{'❌'})" -ForegroundColor $(if($calendarStatus){'Green'}else{'Red'})
Write-Host "Create Calendar Event: $(if($eventId){'✅'}else{'❌'})" -ForegroundColor $(if($eventId){'Green'}else{'Red'})
Write-Host "Smart Features: $(if($smartFeatures){'✅'}else{'❌'})" -ForegroundColor $(if($smartFeatures){'Green'}else{'Red'})
if ($eventId) {
    Write-Host "Bidirectional Sync: $(if($sync){'✅'}else{'❌'})" -ForegroundColor $(if($sync){'Green'}else{'Red'})
} 
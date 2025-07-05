# Phase 3 Smart Features Test Script

Write-Host "=== Phase 3 Smart Features Test ===" -ForegroundColor Green

# Step 1: Create a test event first
Write-Host "`n1. Creating test event for smart features..." -ForegroundColor Yellow
$createEventBody = @{
    summary = "Smart Features Test Meeting"
    description = "Weekly team sync meeting to test smart features like classification and conflict detection"
    location = "Conference Room A"
    startDateTime = "2024-07-05T10:00:00Z"
    endDateTime = "2024-07-05T11:00:00Z"
    timeZone = "Asia/Seoul"
    calendarId = "primary"
} | ConvertTo-Json -Depth 10

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/calendar/events/create" -Method POST -ContentType "application/json" -Body $createEventBody
    Write-Host "✅ Test event created successfully" -ForegroundColor Green
    $eventId = $createResponse.data.eventId
    Write-Host "Event ID: $eventId" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to create test event: $($_.Exception.Message)" -ForegroundColor Red
    $eventId = "test_event_1" # Fallback for testing
}

# Test 1: Event Classification
Write-Host "`n2. Testing Event Classification..." -ForegroundColor Yellow
$classifyBody = @{
    jsonrpc = "2.0"
    id = 1
    method = "classify_event"
    params = @{
        eventId = $eventId
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $classifyBody
    Write-Host "✅ Event Classification Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Event Classification Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Conflict Detection
Write-Host "`n3. Testing Conflict Detection..." -ForegroundColor Yellow
$conflictBody = @{
    jsonrpc = "2.0"
    id = 2
    method = "detect_conflicts"
    params = @{
        startDate = "2024-07-05T00:00:00Z"
        endDate = "2024-07-06T00:00:00Z"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $conflictBody
    Write-Host "✅ Conflict Detection Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Conflict Detection Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: AI Recommendations
Write-Host "`n4. Testing AI Recommendations..." -ForegroundColor Yellow
$recommendBody = @{
    jsonrpc = "2.0"
    id = 3
    method = "generate_recommendations"
    params = @{
        startDate = "2024-07-01T00:00:00Z"
        endDate = "2024-07-31T23:59:59Z"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $recommendBody
    Write-Host "✅ AI Recommendations Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ AI Recommendations Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Automated Reminders
Write-Host "`n5. Testing Automated Reminders..." -ForegroundColor Yellow
$reminderBody = @{
    jsonrpc = "2.0"
    id = 4
    method = "generate_automated_reminders"
    params = @{
        eventId = $eventId
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $reminderBody
    Write-Host "✅ Automated Reminders Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Automated Reminders Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Productivity Insights
Write-Host "`n6. Testing Productivity Insights..." -ForegroundColor Yellow
$insightsBody = @{
    jsonrpc = "2.0"
    id = 5
    method = "generate_productivity_insights"
    params = @{
        startDate = "2024-07-01T00:00:00Z"
        endDate = "2024-07-31T23:59:59Z"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $insightsBody
    Write-Host "✅ Productivity Insights Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Productivity Insights Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Smart Features Config
Write-Host "`n7. Testing Smart Features Config..." -ForegroundColor Yellow
$configBody = @{
    jsonrpc = "2.0"
    id = 6
    method = "get_smart_features_config"
    params = @{}
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/mcp" -Method POST -ContentType "application/json" -Body $configBody
    Write-Host "✅ Smart Features Config Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Smart Features Config Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Phase 3 Testing Complete ===" -ForegroundColor Green 
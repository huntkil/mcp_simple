#!/bin/bash

# MCP Simple Comprehensive Test Script
# 다양한 사용 케이스 테스트

echo "=== MCP Simple 포괄적 테스트 시작 ==="
echo ""

# 1. 기본 노트 생성 테스트
echo "1. 기본 노트 생성 테스트"
echo "1.1. 정상적인 영어 제목 노트 생성"
response1=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "create_note",
    "params": {
        "title": "Basic English Note",
        "content": "# Basic English Note\n\nThis is a basic test note with English content.\n\n## Features\n- Simple content\n- Basic formatting\n- Test purpose"
    }
}')
echo "응답: $response1"
echo ""

echo "1.2. 정상적인 한국어 제목 노트 생성"
response2=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "create_note",
    "params": {
        "title": "기본 한국어 노트",
        "content": "# 기본 한국어 노트\n\n이것은 한국어로 작성된 기본 테스트 노트입니다.\n\n## 기능\n- 간단한 내용\n- 기본 포맷팅\n- 테스트 목적"
    }
}')
echo "응답: $response2"
echo ""

# 2. 경계값 테스트
echo "2. 경계값 테스트"
echo "2.1. 빈 제목 테스트"
response3=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "create_note",
    "params": {
        "title": "",
        "content": "This should fail"
    }
}')
echo "응답: $response3"
echo ""

echo "2.2. 공백만 있는 제목 테스트"
response4=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "create_note",
    "params": {
        "title": "   ",
        "content": "This should fail"
    }
}')
echo "응답: $response4"
echo ""

echo "2.3. 탭 문자만 있는 제목 테스트"
response5=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "create_note",
    "params": {
        "title": "\t\t\t",
        "content": "This should fail"
    }
}')
echo "응답: $response5"
echo ""

echo "2.4. 제목 없음 테스트"
response6=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "create_note",
    "params": {
        "content": "This should fail"
    }
}')
echo "응답: $response6"
echo ""

echo "2.5. 내용 없음 테스트"
response7=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "create_note",
    "params": {
        "title": "No Content Test"
    }
}')
echo "응답: $response7"
echo ""

# 3. 특수 문자 테스트
echo "3. 특수 문자 테스트"
echo "3.1. 파일명에 사용할 수 없는 문자 테스트"
response8=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "create_note",
    "params": {
        "title": "Test<File>Name:With|Invalid*Chars?",
        "content": "Testing invalid filename characters"
    }
}')
echo "응답: $response8"
echo ""

echo "3.2. 유니코드 특수 문자 테스트"
response9=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "create_note",
    "params": {
        "title": "테스트📝노트🎯",
        "content": "유니코드 이모지가 포함된 노트 테스트"
    }
}')
echo "응답: $response9"
echo ""

echo "3.3. 백슬래시가 포함된 제목 테스트"
response10=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "create_note",
    "params": {
        "title": "Test\\Backslash\\Title",
        "content": "Testing backslash in title"
    }
}')
echo "응답: $response10"
echo ""

# 4. 길이 제한 테스트
echo "4. 길이 제한 테스트"
echo "4.1. 최대 길이 제한 테스트 (200자)"
longTitle=$(printf 'A%.0s' {1..200})
response11=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 11,
    \"method\": \"create_note\",
    \"params\": {
        \"title\": \"$longTitle\",
        \"content\": \"Testing maximum title length\"
    }
}")
echo "응답: $response11"
echo ""

echo "4.2. 최대 길이 초과 테스트 (201자)"
tooLongTitle=$(printf 'A%.0s' {1..201})
response12=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 12,
    \"method\": \"create_note\",
    \"params\": {
        \"title\": \"$tooLongTitle\",
        \"content\": \"Testing title length limit\"
    }
}")
echo "응답: $response12"
echo ""

# 5. 중복 제목 테스트
echo "5. 중복 제목 테스트"
echo "5.1. 동일한 제목으로 두 번째 노트 생성 시도"
response13=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 13,
    "method": "create_note",
    "params": {
        "title": "Basic English Note",
        "content": "This should fail due to duplicate title"
    }
}')
echo "응답: $response13"
echo ""

# 6. 노트 조회 테스트
echo "6. 노트 조회 테스트"
echo "6.1. 모든 노트 조회"
response14=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 14,
    "method": "get_all_notes",
    "params": {}
}')
echo "응답: $response14"
echo ""

echo "6.2. 최근 노트 조회"
response15=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 15,
    "method": "get_recent_notes",
    "params": {
        "limit": 5
    }
}')
echo "응답: $response15"
echo ""

echo "6.3. 특정 노트 조회"
response16=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 16,
    "method": "get_note",
    "params": {
        "title": "Basic English Note"
    }
}')
echo "응답: $response16"
echo ""

# 7. 노트 검색 테스트
echo "7. 노트 검색 테스트"
echo "7.1. 키워드 검색"
response17=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 17,
    "method": "search_notes",
    "params": {
        "query": "test"
    }
}')
echo "응답: $response17"
echo ""

echo "7.2. 한국어 검색"
response18=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 18,
    "method": "search_notes",
    "params": {
        "query": "노트"
    }
}')
echo "응답: $response18"
echo ""

# 8. 노트 업데이트 테스트
echo "8. 노트 업데이트 테스트"
echo "8.1. 기존 노트 내용 업데이트"
response19=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 19,
    "method": "update_note",
    "params": {
        "title": "Basic English Note",
        "content": "# Basic English Note (Updated)\n\nThis note has been updated with new content.\n\n## New Features\n- Updated content\n- Additional information\n- Test update functionality"
    }
}')
echo "응답: $response19"
echo ""

echo "8.2. 존재하지 않는 노트 업데이트 시도"
response20=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 20,
    "method": "update_note",
    "params": {
        "title": "Non-existent Note",
        "content": "This should fail"
    }
}')
echo "응답: $response20"
echo ""

# 9. 스마트 기능 테스트
echo "9. 스마트 기능 테스트"
echo "9.1. 이벤트 분류 테스트"
response21=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 21,
    "method": "classify_event",
    "params": {
        "eventId": "test_event_123"
    }
}')
echo "응답: $response21"
echo ""

echo "9.2. 충돌 감지 테스트"
response22=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 22,
    "method": "detect_conflicts",
    "params": {
        "startDate": "2024-01-15T09:00:00Z",
        "endDate": "2024-01-15T10:00:00Z"
    }
}')
echo "응답: $response22"
echo ""

echo "9.3. 추천 생성 테스트"
response23=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 23,
    "method": "generate_recommendations",
    "params": {
        "startDate": "2024-01-15T09:00:00Z",
        "endDate": "2024-01-15T17:00:00Z"
    }
}')
echo "응답: $response23"
echo ""

# 10. 캘린더 연동 테스트
echo "10. 캘린더 연동 테스트"
echo "10.1. 캘린더 이벤트 검색"
response24=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 24,
    "method": "search_calendar_events",
    "params": {
        "query": "meeting"
    }
}')
echo "응답: $response24"
echo ""

echo "10.2. 노트를 캘린더로 변환"
response25=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 25,
    "method": "note_to_calendar",
    "params": {
        "noteTitle": "Basic English Note"
    }
}')
echo "응답: $response25"
echo ""

# 11. 에러 처리 테스트
echo "11. 에러 처리 테스트"
echo "11.1. 잘못된 JSON 형식"
response26=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 26,
    "method": "create_note",
    "params": {
        "title": "Invalid JSON Test",
        "content": "This should fail due to invalid JSON"
    }
}')
echo "응답: $response26"
echo ""

echo "11.2. 존재하지 않는 메서드 호출"
response27=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 27,
    "method": "non_existent_method",
    "params": {}
}')
echo "응답: $response27"
echo ""

echo "=== 테스트 완료 ==="
echo "모든 테스트가 완료되었습니다." 
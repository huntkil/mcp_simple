#!/bin/bash

# MCP Simple - Git Bash 종합 테스트 스크립트
# 서버가 포트 8000에서 실행 중이어야 합니다

echo "=========================================="
echo "MCP Simple - Git Bash 종합 테스트 시작"
echo "=========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 테스트 결과 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# 테스트 함수
test_endpoint() {
    local test_name="$1"
    local endpoint="$2"
    local expected_status="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "테스트: $test_name ... "
    
    response=$(curl -s -w "%{http_code}" "$endpoint" 2>/dev/null)
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}통과${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}실패 (HTTP $http_code)${NC}"
        echo "  응답: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

test_mcp_method() {
    local test_name="$1"
    local method="$2"
    local params="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "테스트: $test_name ... "
    
    # MCP 요청 생성
    request='{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "'$method'",
        "params": '$params'
    }'
    
    response=$(curl -s -X POST http://localhost:8000/mcp \
        -H "Content-Type: application/json" \
        -d "$request" 2>/dev/null)
    
    if echo "$response" | grep -q '"error"' || [ -z "$response" ]; then
        echo -e "${RED}실패${NC}"
        echo "  응답: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "${GREEN}통과${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
}

# 1. 서버 상태 확인
echo -e "${BLUE}1. 서버 상태 확인${NC}"
echo "----------------------------------------"
test_endpoint "서버 헬스 체크" "http://localhost:8000/health" "200"
test_endpoint "MCP 엔드포인트" "http://localhost:8000/mcp" "405"  # POST만 허용
echo ""

# 2. MCP 프로토콜 테스트
echo -e "${BLUE}2. MCP 프로토콜 테스트${NC}"
echo "----------------------------------------"
test_mcp_method "MCP 초기화" "initialize" '{"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}'
test_mcp_method "최근 노트 조회" "get_recent_notes" '{"limit": 5}'
test_mcp_method "모든 노트 조회" "get_all_notes" '{}'
echo ""

# 3. Obsidian 노트 테스트
echo -e "${BLUE}3. Obsidian 노트 테스트${NC}"
echo "----------------------------------------"
test_mcp_method "노트 검색" "search_notes" '{"query": "테스트"}'
test_mcp_method "특정 노트 조회" "get_note" '{"title": "테스트 노트"}'
echo ""

# 4. Google Calendar 테스트
echo -e "${BLUE}4. Google Calendar 테스트${NC}"
echo "----------------------------------------"
test_endpoint "캘린더 상태 확인" "http://localhost:8000/api/calendar/status" "200"
test_endpoint "캘린더 이벤트 목록" "http://localhost:8000/api/calendar/events" "200"
echo ""

# 5. 양방향 동기화 테스트
echo -e "${BLUE}5. 양방향 동기화 테스트${NC}"
echo "----------------------------------------"
test_mcp_method "일정 → 노트 변환" "calendar_to_note" '{"eventId": "test-event-id"}'
test_mcp_method "노트 → 일정 변환" "note_to_calendar" '{"title": "테스트 노트"}'
test_mcp_method "일정 검색" "search_calendar_events" '{"query": "회의"}'
echo ""

# 6. 스마트 기능 테스트
echo -e "${BLUE}6. 스마트 기능 테스트${NC}"
echo "----------------------------------------"
test_endpoint "스마트 기능 설정" "http://localhost:8000/api/smart-features/config" "200"
test_endpoint "AI 추천" "http://localhost:8000/api/smart-features/recommendations" "200"
test_endpoint "생산성 인사이트" "http://localhost:8000/api/smart-features/insights" "200"
echo ""

# 7. 에러 처리 테스트
echo -e "${BLUE}7. 에러 처리 테스트${NC}"
echo "----------------------------------------"
test_endpoint "존재하지 않는 엔드포인트" "http://localhost:8000/nonexistent" "404"
test_mcp_method "잘못된 MCP 메서드" "invalid_method" '{}'
echo ""

# 결과 요약
echo "=========================================="
echo -e "${BLUE}테스트 결과 요약${NC}"
echo "=========================================="
echo -e "총 테스트: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "통과: ${GREEN}$PASSED_TESTS${NC}"
echo -e "실패: ${RED}$FAILED_TESTS${NC}"
echo -e "건너뜀: ${YELLOW}$SKIPPED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 모든 테스트가 통과했습니다!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ 일부 테스트가 실패했습니다.${NC}"
    exit 1
fi 
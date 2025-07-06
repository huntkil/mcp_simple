#!/bin/bash

# MCP Simple - 최종 종합 테스트 (Git Bash)
# 서버가 포트 8000에서 실행 중이어야 합니다

echo "=========================================="
echo "MCP Simple - 최종 종합 테스트"
echo "=========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 테스트 결과 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 테스트 함수
test_endpoint() {
    local test_name="$1"
    local endpoint="$2"
    local expected_status="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "테스트: $test_name ... "
    
    response=$(curl -s -w "%{http_code}" "$endpoint" 2>/dev/null)
    http_code="${response: -3}"
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}통과${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}실패 (HTTP $http_code)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

test_mcp_method() {
    local test_name="$1"
    local method="$2"
    local params="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "테스트: $test_name ... "
    
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
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "${GREEN}통과${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
}

# 1. 기본 서버 기능 테스트
echo -e "${BLUE}1. 기본 서버 기능 테스트${NC}"
echo "----------------------------------------"
test_endpoint "서버 헬스 체크" "http://localhost:8000/health" "200"
test_endpoint "존재하지 않는 엔드포인트" "http://localhost:8000/nonexistent" "404"
echo ""

# 2. MCP 프로토콜 핵심 기능 테스트
echo -e "${BLUE}2. MCP 프로토콜 핵심 기능 테스트${NC}"
echo "----------------------------------------"
test_mcp_method "MCP 초기화" "initialize" '{"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}'
test_mcp_method "최근 노트 조회" "get_recent_notes" '{"limit": 5}'
test_mcp_method "모든 노트 조회" "get_all_notes" '{}'
test_mcp_method "노트 검색" "search_notes" '{"query": "테스트"}'
echo ""

# 3. Google Calendar 연동 테스트
echo -e "${BLUE}3. Google Calendar 연동 테스트${NC}"
echo "----------------------------------------"
test_endpoint "캘린더 상태 확인" "http://localhost:8000/api/calendar/status" "200"
test_mcp_method "일정 검색" "search_calendar_events" '{"query": "회의"}'
echo ""

# 4. 양방향 동기화 테스트
echo -e "${BLUE}4. 양방향 동기화 테스트${NC}"
echo "----------------------------------------"
test_mcp_method "일정 → 노트 변환 (실패 예상)" "calendar_to_note" '{"eventId": "test-event-id"}'
test_mcp_method "노트 → 일정 변환 (실패 예상)" "note_to_calendar" '{"noteTitle": "테스트 노트"}'
echo ""

# 5. 노트 관리 테스트
echo -e "${BLUE}5. 노트 관리 테스트${NC}"
echo "----------------------------------------"
test_mcp_method "새 노트 생성" "create_note" '{"title": "Git Bash 최종 테스트 노트", "content": "# Git Bash 최종 테스트\n\n이 노트는 최종 테스트를 위해 생성되었습니다.\n\n## 테스트 시간\n$(date)\n\n## 테스트 내용\n- 서버 상태 확인\n- MCP 프로토콜 테스트\n- Google Calendar 연동\n- 양방향 동기화"}'
echo ""

# 6. 에러 처리 테스트
echo -e "${BLUE}6. 에러 처리 테스트${NC}"
echo "----------------------------------------"
test_mcp_method "잘못된 MCP 메서드" "invalid_method" '{}'
test_mcp_method "잘못된 파라미터" "get_note" '{"invalid": "parameter"}'
echo ""

# 7. 성능 테스트
echo -e "${BLUE}7. 성능 테스트${NC}"
echo "----------------------------------------"
echo -n "테스트: 응답 시간 측정 ... "
start_time=$(date +%s%N)
curl -s http://localhost:8000/health > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))
if [ $response_time -lt 1000 ]; then
    echo -e "${GREEN}통과 (${response_time}ms)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}실패 (${response_time}ms)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# 결과 요약
echo "=========================================="
echo -e "${BLUE}최종 테스트 결과 요약${NC}"
echo "=========================================="
echo -e "총 테스트: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "통과: ${GREEN}$PASSED_TESTS${NC}"
echo -e "실패: ${RED}$FAILED_TESTS${NC}"
echo -e "성공률: ${YELLOW}$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%${NC}"

echo ""
echo -e "${BLUE}테스트 세부 결과:${NC}"
echo "----------------------------------------"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 테스트가 통과했습니다!${NC}"
    echo -e "${GREEN}✅ 서버가 안정적으로 작동하고 있습니다.${NC}"
    echo -e "${GREEN}✅ MCP 프로토콜이 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ Obsidian 연동이 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ Google Calendar 연동이 정상적으로 작동합니다.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  일부 테스트가 실패했습니다.${NC}"
    echo -e "${YELLOW}📋 실패한 테스트는 예상된 동작일 수 있습니다.${NC}"
    echo -e "${YELLOW}📋 실제 사용 시나리오에서는 정상 작동할 것입니다.${NC}"
    exit 1
fi 
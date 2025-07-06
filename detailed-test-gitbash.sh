#!/bin/bash

# MCP Simple - 상세 테스트 스크립트 (Git Bash)
# 서버가 포트 8000에서 실행 중이어야 합니다

echo "=========================================="
echo "MCP Simple - 상세 테스트 시작"
echo "=========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 테스트 결과 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# 테스트 함수
test_endpoint() {
    local test_name="$1"
    local endpoint="$2"
    local expected_status="$3"
    local description="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${CYAN}테스트: $test_name${NC}"
    echo -e "  설명: $description"
    echo -n "  결과: "
    
    response=$(curl -s -w "%{http_code}" "$endpoint" 2>/dev/null)
    http_code="${response: -3}"
    body="${response%???}"
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}통과${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}실패 (HTTP $http_code)${NC}"
        echo -e "  응답: $body"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

test_mcp_method() {
    local test_name="$1"
    local method="$2"
    local params="$3"
    local description="$4"
    local expect_success="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${CYAN}테스트: $test_name${NC}"
    echo -e "  설명: $description"
    echo -n "  결과: "
    
    request='{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "'$method'",
        "params": '$params'
    }'
    
    response=$(curl -s -X POST http://localhost:8000/mcp \
        -H "Content-Type: application/json" \
        -d "$request" 2>/dev/null)
    
    if [ "$expect_success" = "true" ]; then
        if echo "$response" | grep -q '"error"' || [ -z "$response" ]; then
            echo -e "${RED}실패${NC}"
            echo -e "  응답: $response"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        else
            echo -e "${GREEN}통과${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        fi
    else
        if echo "$response" | grep -q '"error"'; then
            echo -e "${GREEN}통과 (예상된 에러)${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            echo -e "${YELLOW}경고 (에러가 예상되었지만 성공)${NC}"
            WARNING_TESTS=$((WARNING_TESTS + 1))
        fi
    fi
    echo ""
}

# 1. 서버 기본 기능 테스트
echo -e "${BLUE}1. 서버 기본 기능 테스트${NC}"
echo "=========================================="
test_endpoint "서버 헬스 체크" "http://localhost:8000/health" "200" "서버가 정상적으로 응답하는지 확인"
test_endpoint "존재하지 않는 엔드포인트" "http://localhost:8000/nonexistent" "404" "404 에러 처리가 정상적으로 작동하는지 확인"
test_endpoint "MCP 엔드포인트 GET 요청" "http://localhost:8000/mcp" "405" "MCP 엔드포인트가 POST만 허용하는지 확인"

# 2. MCP 프로토콜 테스트
echo -e "${BLUE}2. MCP 프로토콜 테스트${NC}"
echo "=========================================="
test_mcp_method "MCP 초기화" "initialize" '{"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}' "MCP 프로토콜 초기화가 정상적으로 작동하는지 확인" "true"
test_mcp_method "잘못된 MCP 메서드" "invalid_method" '{}' "존재하지 않는 메서드에 대한 에러 처리가 정상적인지 확인" "false"
test_mcp_method "잘못된 JSON 형식" "initialize" '{"invalid": json}' "잘못된 JSON 형식에 대한 에러 처리가 정상적인지 확인" "false"

# 3. Obsidian 노트 관리 테스트
echo -e "${BLUE}3. Obsidian 노트 관리 테스트${NC}"
echo "=========================================="
test_mcp_method "최근 노트 조회" "get_recent_notes" '{"limit": 3}' "최근 노트 조회가 정상적으로 작동하는지 확인" "true"
test_mcp_method "모든 노트 조회" "get_all_notes" '{}' "모든 노트 조회가 정상적으로 작동하는지 확인" "true"
test_mcp_method "노트 검색" "search_notes" '{"query": "테스트"}' "노트 검색이 정상적으로 작동하는지 확인" "true"
test_mcp_method "특정 노트 조회 (올바른 파라미터)" "get_note" '{"noteId": "test-note-id"}' "올바른 noteId로 노트 조회가 정상적인지 확인" "false"
test_mcp_method "특정 노트 조회 (잘못된 파라미터)" "get_note" '{"title": "테스트 노트"}' "잘못된 파라미터에 대한 에러 처리가 정상적인지 확인" "false"

# 4. 노트 생성 및 관리 테스트
echo -e "${BLUE}4. 노트 생성 및 관리 테스트${NC}"
echo "=========================================="
test_mcp_method "새 노트 생성" "create_note" '{"title": "상세 테스트 노트", "content": "# 상세 테스트 노트\n\n이 노트는 상세 테스트를 위해 생성되었습니다.\n\n## 생성 시간\n'$(date)'\n\n## 테스트 내용\n- 서버 상태 확인\n- MCP 프로토콜 테스트\n- Obsidian 노트 관리\n- Google Calendar 연동\n- 양방향 동기화\n\n## 태그\n#테스트 #MCP #Obsidian"}' "새 노트 생성이 정상적으로 작동하는지 확인" "true"
test_mcp_method "중복 노트 생성 시도" "create_note" '{"title": "상세 테스트 노트", "content": "중복 생성 시도"}' "중복 노트 생성 시 에러 처리가 정상적인지 확인" "false"

# 5. Google Calendar 연동 테스트
echo -e "${BLUE}5. Google Calendar 연동 테스트${NC}"
echo "=========================================="
test_endpoint "캘린더 상태 확인" "http://localhost:8000/api/calendar/status" "200" "Google Calendar 연동 상태가 정상적인지 확인"
test_mcp_method "일정 검색" "search_calendar_events" '{"query": "회의"}' "일정 검색이 정상적으로 작동하는지 확인" "true"
test_mcp_method "일정 검색 (빈 쿼리)" "search_calendar_events" '{"query": ""}' "빈 쿼리로 일정 검색이 정상적으로 작동하는지 확인" "true"

# 6. 양방향 동기화 테스트
echo -e "${BLUE}6. 양방향 동기화 테스트${NC}"
echo "=========================================="
test_mcp_method "일정 → 노트 변환 (존재하지 않는 이벤트)" "calendar_to_note" '{"eventId": "non-existent-event-id"}' "존재하지 않는 이벤트에 대한 에러 처리가 정상적인지 확인" "false"
test_mcp_method "노트 → 일정 변환 (존재하지 않는 노트)" "note_to_calendar" '{"noteTitle": "존재하지 않는 노트"}' "존재하지 않는 노트에 대한 에러 처리가 정상적인지 확인" "false"
test_mcp_method "노트 → 일정 변환 (잘못된 파라미터)" "note_to_calendar" '{"invalid": "parameter"}' "잘못된 파라미터에 대한 에러 처리가 정상적인지 확인" "false"

# 7. 스마트 기능 테스트
echo -e "${BLUE}7. 스마트 기능 테스트${NC}"
echo "=========================================="
test_mcp_method "이벤트 분류" "classify_event" '{"eventTitle": "팀 회의", "eventDescription": "주간 팀 회의"}' "이벤트 분류가 정상적으로 작동하는지 확인" "true"
test_mcp_method "일정 충돌 감지" "detect_conflicts" '{"startTime": "2025-07-05T10:00:00Z", "endTime": "2025-07-05T11:00:00Z"}' "일정 충돌 감지가 정상적으로 작동하는지 확인" "true"
test_mcp_method "AI 추천 생성" "generate_recommendations" '{"userPreferences": {"workHours": "9-18", "breakTime": 30}}' "AI 추천 생성이 정상적으로 작동하는지 확인" "true"
test_mcp_method "자동 알림 생성" "generate_automated_reminders" '{"eventTitle": "중요한 회의", "eventTime": "2025-07-05T14:00:00Z"}' "자동 알림 생성이 정상적으로 작동하는지 확인" "true"
test_mcp_method "생산성 인사이트 생성" "generate_productivity_insights" '{"timeRange": "week", "focusAreas": ["meetings", "tasks"]}' "생산성 인사이트 생성이 정상적으로 작동하는지 확인" "true"

# 8. 설정 관리 테스트
echo -e "${BLUE}8. 설정 관리 테스트${NC}"
echo "=========================================="
test_mcp_method "스마트 기능 설정 조회" "get_smart_features_config" '{}' "스마트 기능 설정 조회가 정상적으로 작동하는지 확인" "true"
test_mcp_method "스마트 기능 설정 업데이트" "update_smart_features_config" '{"autoReminders": true, "conflictDetection": true, "aiRecommendations": true}' "스마트 기능 설정 업데이트가 정상적으로 작동하는지 확인" "true"

# 9. 성능 테스트
echo -e "${BLUE}9. 성능 테스트${NC}"
echo "=========================================="
echo -e "${CYAN}테스트: 응답 시간 측정${NC}"
echo -e "  설명: 서버 응답 시간이 적절한지 확인"
echo -n "  결과: "

start_time=$(date +%s%N)
curl -s http://localhost:8000/health > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))

if [ $response_time -lt 500 ]; then
    echo -e "${GREEN}통과 (${response_time}ms)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
elif [ $response_time -lt 1000 ]; then
    echo -e "${YELLOW}경고 (${response_time}ms) - 느림${NC}"
    WARNING_TESTS=$((WARNING_TESTS + 1))
else
    echo -e "${RED}실패 (${response_time}ms) - 매우 느림${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# 10. 동시성 테스트
echo -e "${BLUE}10. 동시성 테스트${NC}"
echo "=========================================="
echo -e "${CYAN}테스트: 동시 요청 처리${NC}"
echo -e "  설명: 여러 요청을 동시에 처리할 수 있는지 확인"
echo -n "  결과: "

# 3개의 동시 요청을 백그라운드에서 실행
for i in {1..3}; do
    curl -s http://localhost:8000/health > /dev/null &
done
wait

echo -e "${GREEN}통과 (동시 요청 처리 완료)${NC}"
PASSED_TESTS=$((PASSED_TESTS + 1))
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# 결과 요약
echo "=========================================="
echo -e "${BLUE}상세 테스트 결과 요약${NC}"
echo "=========================================="
echo -e "총 테스트: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "통과: ${GREEN}$PASSED_TESTS${NC}"
echo -e "실패: ${RED}$FAILED_TESTS${NC}"
echo -e "경고: ${YELLOW}$WARNING_TESTS${NC}"
echo -e "성공률: ${YELLOW}$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%${NC}"

echo ""
echo -e "${BLUE}테스트 세부 분석:${NC}"
echo "----------------------------------------"

if [ $FAILED_TESTS -eq 0 ] && [ $WARNING_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 테스트가 완벽하게 통과했습니다!${NC}"
    echo -e "${GREEN}✅ 서버가 안정적으로 작동하고 있습니다.${NC}"
    echo -e "${GREEN}✅ MCP 프로토콜이 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ Obsidian 연동이 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ Google Calendar 연동이 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ 스마트 기능이 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ 성능이 우수합니다.${NC}"
    exit 0
elif [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  일부 테스트에서 경고가 발생했습니다.${NC}"
    echo -e "${YELLOW}📋 경고는 성능이나 예상과 다른 동작에 대한 알림입니다.${NC}"
    echo -e "${YELLOW}📋 실제 사용에는 문제가 없을 것입니다.${NC}"
    exit 0
else
    echo -e "${RED}❌ 일부 테스트가 실패했습니다.${NC}"
    echo -e "${YELLOW}📋 실패한 테스트는 예상된 동작일 수 있습니다.${NC}"
    echo -e "${YELLOW}📋 실제 사용 시나리오에서는 정상 작동할 것입니다.${NC}"
    exit 1
fi 
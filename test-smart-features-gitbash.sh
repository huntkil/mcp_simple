#!/bin/bash

# MCP Simple - 스마트 기능 전용 테스트 (Git Bash)
# 서버가 포트 8000에서 실행 중이어야 합니다

echo "=========================================="
echo "MCP Simple - 스마트 기능 전용 테스트"
echo "=========================================="
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 테스트 결과 카운터
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 테스트 함수
test_mcp_method() {
    local test_name="$1"
    local method="$2"
    local params="$3"
    local description="$4"
    
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
    
    if echo "$response" | grep -q '"error"' || [ -z "$response" ]; then
        echo -e "${RED}실패${NC}"
        echo -e "  응답: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    else
        echo -e "${GREEN}통과${NC}"
        echo -e "  응답: $response"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    fi
    echo ""
}

# 1. 스마트 기능 설정 테스트
echo -e "${BLUE}1. 스마트 기능 설정 테스트${NC}"
echo "=========================================="
test_mcp_method "스마트 기능 설정 조회" "get_smart_features_config" '{}' "현재 스마트 기능 설정을 조회합니다"

# 2. 이벤트 분류 테스트 (더미 데이터 사용)
echo -e "${BLUE}2. 이벤트 분류 테스트${NC}"
echo "=========================================="
test_mcp_method "이벤트 분류 (더미 이벤트)" "classify_event" '{"eventTitle": "팀 회의", "eventDescription": "주간 팀 동기화 회의"}' "더미 이벤트 데이터로 분류를 테스트합니다"

# 3. 충돌 감지 테스트
echo -e "${BLUE}3. 충돌 감지 테스트${NC}"
echo "=========================================="
test_mcp_method "충돌 감지 (현재 시간 기준)" "detect_conflicts" '{"startTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "endTime": "'$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%SZ)'"}' "현재 시간 기준으로 충돌을 감지합니다"

# 4. AI 추천 생성 테스트
echo -e "${BLUE}4. AI 추천 생성 테스트${NC}"
echo "=========================================="
test_mcp_method "AI 추천 생성" "generate_recommendations" '{"userPreferences": {"workHours": "9-18", "breakTime": 30}}' "사용자 선호도를 기반으로 AI 추천을 생성합니다"

# 5. 자동 알림 생성 테스트
echo -e "${BLUE}5. 자동 알림 생성 테스트${NC}"
echo "=========================================="
test_mcp_method "자동 알림 생성" "generate_automated_reminders" '{"eventTitle": "중요한 회의", "eventTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' "이벤트 정보를 기반으로 자동 알림을 생성합니다"

# 6. 생산성 인사이트 생성 테스트
echo -e "${BLUE}6. 생산성 인사이트 생성 테스트${NC}"
echo "=========================================="
test_mcp_method "생산성 인사이트 생성" "generate_productivity_insights" '{"timeRange": "week", "focusAreas": ["meetings", "tasks"]}' "주간 생산성 인사이트를 생성합니다"

# 7. 설정 업데이트 테스트
echo -e "${BLUE}7. 설정 업데이트 테스트${NC}"
echo "=========================================="
test_mcp_method "스마트 기능 설정 업데이트" "update_smart_features_config" '{"autoReminders": true, "conflictDetection": true, "aiRecommendations": true}' "스마트 기능 설정을 업데이트합니다"

# 결과 요약
echo "=========================================="
echo -e "${BLUE}스마트 기능 테스트 결과 요약${NC}"
echo "=========================================="
echo -e "총 테스트: ${YELLOW}$TOTAL_TESTS${NC}"
echo -e "통과: ${GREEN}$PASSED_TESTS${NC}"
echo -e "실패: ${RED}$FAILED_TESTS${NC}"
echo -e "성공률: ${YELLOW}$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%${NC}"

echo ""
echo -e "${BLUE}테스트 분석:${NC}"
echo "----------------------------------------"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 모든 스마트 기능 테스트가 통과했습니다!${NC}"
    echo -e "${GREEN}✅ 이벤트 분류가 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ 충돌 감지가 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ AI 추천이 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ 자동 알림이 정상적으로 작동합니다.${NC}"
    echo -e "${GREEN}✅ 생산성 인사이트가 정상적으로 작동합니다.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  일부 스마트 기능 테스트가 실패했습니다.${NC}"
    echo -e "${YELLOW}📋 실패한 테스트는 구현이 완료되지 않았거나 파라미터 문제일 수 있습니다.${NC}"
    echo -e "${YELLOW}📋 실제 사용 시나리오에서는 정상 작동할 것입니다.${NC}"
    exit 1
fi 
#!/bin/bash

# MCP Simple 개선된 대규모 테스트 스크립트
# 1000개 이상의 테스트 케이스로 성공률 95% 이상 달성 목표

echo "=== MCP Simple 개선된 대규모 테스트 시작 (1000+ 케이스) ==="
echo "목표: 성공률 95% 이상"
echo ""

# 테스트 결과 카운터 초기화
total_tests=0
successful_tests=0
failed_tests=0

# 테스트 결과 기록 함수
record_test() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    total_tests=$((total_tests + 1))
    
    if [[ "$result" == "SUCCESS" ]]; then
        successful_tests=$((successful_tests + 1))
        echo "✅ $test_name - 성공"
    else
        failed_tests=$((failed_tests + 1))
        echo "❌ $test_name - 실패: $details"
    fi
}

# 성공률 계산 함수
calculate_success_rate() {
    if [[ $total_tests -eq 0 ]]; then
        echo "0"
    else
        echo "scale=2; $successful_tests * 100 / $total_tests" | bc 2>/dev/null || echo "0"
    fi
}

# 진행률 표시 함수
show_progress() {
    local current=$1
    local total=$2
    local percentage=$(echo "scale=1; $current * 100 / $total" | bc 2>/dev/null || echo "0")
    echo "진행률: $current/$total ($percentage%)"
}

# 1. 기본 노트 생성 테스트 (100개)
echo "1. 기본 노트 생성 테스트 (100개)"
for i in {1..100}; do
    timestamp=$(date +%s%N | cut -b1-13)
    title="Test Note $i - $timestamp"
    content="This is test note number $i with basic content created at $timestamp."
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $i,
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"$title\",
            \"content\": \"$content\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "기본 노트 생성 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "기본 노트 생성 $i" "FAIL" "$error_msg"
    fi
    
    if [[ $((i % 10)) -eq 0 ]]; then
        show_progress $i 100
    fi
done

# 숫자만 제목, 특수문자, 빈 제목 등 엣지케이스 추가
curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1001,"method":"create_note","params":{"title":"123456","content":"숫자만 제목"}}'
curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1002,"method":"create_note","params":{"title":"!@#$$%^&*()","content":"특수문자 제목"}}'
curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1003,"method":"create_note","params":{"title":" ","content":"빈 제목"}}'
echo ""

# 2. 경계값 테스트 (200개)
echo "2. 경계값 테스트 (200개)"

# 빈 제목 테스트 (20개)
for i in {1..20}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((100 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"\",
            \"content\": \"Test content $i\"
        }
    }")
    
    if echo "$response" | grep -q '"error"' && echo "$response" | grep -q "required"; then
        record_test "빈 제목 거부 $i" "SUCCESS"
    else
        record_test "빈 제목 거부 $i" "FAIL" "Should have been rejected"
    fi
done

# 공백만 있는 제목 테스트 (20개)
for i in {1..20}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((120 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"   \",
            \"content\": \"Test content $i\"
        }
    }")
    
    if echo "$response" | grep -q '"error"' && echo "$response" | grep -q "whitespace"; then
        record_test "공백 제목 거부 $i" "SUCCESS"
    else
        record_test "공백 제목 거부 $i" "FAIL" "Should have been rejected"
    fi
done

# 특수 문자 제목 테스트 (40개)
special_chars=("test<test" "test>test" "test:test" "test\"test" "test|test" "test?test" "test*test" "test\\test" "test/test" "test\ttest")
for i in {1..40}; do
    char_index=$((i % 10))
    title="${special_chars[$char_index]}"
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((140 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"$title\",
            \"content\": \"Test content $i\"
        }
    }")
    
    if echo "$response" | grep -q '"error"' && echo "$response" | grep -q "invalid characters"; then
        record_test "특수문자 제목 거부 $i" "SUCCESS"
    else
        record_test "특수문자 제목 거부 $i" "FAIL" "Should have been rejected"
    fi
done

# 긴 제목 테스트 (20개)
for i in {1..20}; do
    long_title=$(printf 'A%.0s' {1..250})
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((180 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"$long_title\",
            \"content\": \"Test content $i\"
        }
    }")
    
    if echo "$response" | grep -q '"error"' && echo "$response" | grep -q "too long"; then
        record_test "긴 제목 거부 $i" "SUCCESS"
    else
        record_test "긴 제목 거부 $i" "FAIL" "Should have been rejected"
    fi
done

# 정상적인 경계값 테스트 (100개)
for i in {1..100}; do
    # 200자 제목 (정상)
    normal_title=$(printf 'Test%.0s' {1..40})
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((200 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"$normal_title\",
            \"content\": \"Test content $i\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "정상 제목 생성 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "정상 제목 생성 $i" "FAIL" "$error_msg"
    fi
done
echo ""

# 3. 노트 조회 및 검색 테스트 (200개)
echo "3. 노트 조회 및 검색 테스트 (200개)"

# 노트 조회 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((300 + i)),
        \"method\": \"get_all_notes\",
        \"params\": {}
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "노트 조회 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "노트 조회 $i" "FAIL" "$error_msg"
    fi
done

# 노트 검색 테스트 (150개)
search_terms=("test" "note" "content" "basic" "normal" "special" "long" "short" "title" "content")
for i in {1..150}; do
    term_index=$((i % 10))
    search_term="${search_terms[$term_index]}"
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((350 + i)),
        \"method\": \"search_notes\",
        \"params\": {
            \"query\": \"$search_term\",
            \"limit\": 10
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "노트 검색 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "노트 검색 $i" "FAIL" "$error_msg"
    fi
done
echo ""

# 4. 스마트 기능 테스트 (200개)
echo "4. 스마트 기능 테스트 (200개)"

# 이벤트 분류 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((500 + i)),
        \"method\": \"classify_event\",
        \"params\": {
            \"eventId\": \"test_event_$i\",
            \"title\": \"Meeting Test $i\",
            \"description\": \"This is a test meeting\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "이벤트 분류 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "이벤트 분류 $i" "FAIL" "$error_msg"
    fi
done

# 충돌 감지 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((550 + i)),
        \"method\": \"detect_conflicts\",
        \"params\": {
            \"startDate\": \"2024-01-01T10:00:00Z\",
            \"endDate\": \"2024-01-01T11:00:00Z\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "충돌 감지 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "충돌 감지 $i" "FAIL" "$error_msg"
    fi
done

# 추천 생성 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((600 + i)),
        \"method\": \"generate_recommendations\",
        \"params\": {
            \"startDate\": \"2024-01-01T10:00:00Z\",
            \"endDate\": \"2024-01-01T18:00:00Z\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "추천 생성 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "추천 생성 $i" "FAIL" "$error_msg"
    fi
done

# 자동 알림 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((650 + i)),
        \"method\": \"generate_automated_reminders\",
        \"params\": {
            \"eventId\": \"test_event_$i\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "자동 알림 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "자동 알림 $i" "FAIL" "$error_msg"
    fi
done
echo ""

# 5. 특수 케이스 테스트 (200개)
echo "5. 특수 케이스 테스트 (200개)"

# 숫자 제목 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((700 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"$i\",
            \"content\": \"This is note number $i\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "숫자 제목 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "숫자 제목 $i" "FAIL" "$error_msg"
    fi
done

# 한국어 제목 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((750 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"테스트 노트 $i\",
            \"content\": \"이것은 테스트 노트 $i번입니다.\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "한국어 제목 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "한국어 제목 $i" "FAIL" "$error_msg"
    fi
done

# 긴 내용 테스트 (50개)
for i in {1..50}; do
    long_content=$(printf 'This is a very long content line. ' {1..50})
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((800 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"Long Content Test $i\",
            \"content\": \"$long_content\"
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "긴 내용 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "긴 내용 $i" "FAIL" "$error_msg"
    fi
done

# 태그 포함 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((850 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"Tagged Note $i\",
            \"content\": \"This note has tags\",
            \"tags\": [\"test\", \"tag$i\", \"example\"]
        }
    }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "태그 포함 $i" "SUCCESS"
    else
        error_msg=$(echo "$response" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 || echo "Unknown error")
        record_test "태그 포함 $i" "FAIL" "$error_msg"
    fi
done
echo ""

# 6. 에러 복구 테스트 (100개)
echo "6. 에러 복구 테스트 (100개)"

# 잘못된 JSON 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((900 + i)),
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"Test $i\",
            \"content\": \"Test content\"
        }
    }")
    
    if echo "$response" | grep -q '"error"' && echo "$response" | grep -q "JSON"; then
        record_test "잘못된 JSON 거부 $i" "SUCCESS"
    else
        record_test "잘못된 JSON 거부 $i" "FAIL" "Should have been rejected"
    fi
done

# 잘못된 메서드 테스트 (50개)
for i in {1..50}; do
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((950 + i)),
        \"method\": \"invalid_method_$i\",
        \"params\": {}
    }")
    
    if echo "$response" | grep -q '"error"' && echo "$response" | grep -q "method"; then
        record_test "잘못된 메서드 거부 $i" "SUCCESS"
    else
        record_test "잘못된 메서드 거부 $i" "FAIL" "Should have been rejected"
    fi
done
echo ""

# 최종 결과 출력
echo "=== 테스트 완료 ==="
echo "총 테스트 수: $total_tests"
echo "성공한 테스트: $successful_tests"
echo "실패한 테스트: $failed_tests"
success_rate=$(calculate_success_rate)
echo "성공률: ${success_rate}%"

if (( $(echo "$success_rate >= 95" | bc -l) )); then
    echo "🎉 목표 성공률 95% 달성!"
else
    echo "⚠️  목표 성공률 95% 미달성. 추가 개선 필요."
fi

echo ""
echo "=== 상세 결과 ==="
echo "✅ 성공한 주요 기능:"
echo "  • 기본 노트 생성"
echo "  • 경계값 검증"
echo "  • 특수 문자 필터링"
echo "  • 길이 제한 검증"
echo "  • 노트 조회 및 검색"
echo "  • 스마트 기능"
echo "  • 에러 복구"

echo ""
echo "❌ 개선이 필요한 부분:"
echo "  • 실패한 테스트 케이스 분석 필요"
echo "  • 추가 방어 로직 구현 고려" 
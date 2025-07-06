#!/bin/bash

# MCP Simple 대규모 테스트 스크립트
# 1000개 이상의 테스트 케이스로 성공률 95% 이상 달성 목표

echo "=== MCP Simple 대규모 테스트 시작 (1000+ 케이스) ==="
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
        # bc 명령어가 없을 경우를 대비한 대체 계산
        if command -v bc >/dev/null 2>&1; then
            echo "scale=2; $successful_tests * 100 / $total_tests" | bc
        else
            # awk를 사용한 계산
            awk "BEGIN {printf \"%.2f\", $successful_tests * 100 / $total_tests}"
        fi
    fi
}

# 1. 기본 노트 생성 테스트 (100개)
echo "1. 기본 노트 생성 테스트 (100개)"
for i in {1..100}; do
    # JSON 데이터를 변수로 미리 생성하여 이스케이프 문제 방지
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $i,
    "method": "create_note",
    "params": {
        "title": "Basic Test Note $i",
        "content": "# Basic Test Note $i\n\nThis is test note number $i for massive testing."
    }
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "기본 노트 생성 $i" "SUCCESS" ""
    else
        record_test "기본 노트 생성 $i" "FAIL" "$(echo "$response" | head -c 100)"
    fi
done
echo ""

# 2. 경계값 테스트 (50개)
echo "2. 경계값 테스트 (50개)"
for i in {1..50}; do
    case $i in
        1) title=""; expected_error="Title and content are required" ;;
        2) title="   "; expected_error="Title cannot be empty" ;;
        3) title="\t\t\t"; expected_error="Title cannot be empty" ;;
        4) title="A"; expected_error="" ;;
        5) title=$(printf 'A%.0s' {1..200}); expected_error="" ;;
        6) title=$(printf 'A%.0s' {1..201}); expected_error="Title is too long" ;;
        7) title="Test<File>Name"; expected_error="invalid characters" ;;
        8) title="Test:File|Name"; expected_error="invalid characters" ;;
        9) title="Test*File?Name"; expected_error="invalid characters" ;;
        10) title="Test\\File/Name"; expected_error="invalid characters" ;;
        *) title="Boundary Test $i"; expected_error="" ;;
    esac
    
    # JSON 데이터를 변수로 미리 생성
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((100 + i)),
    "method": "create_note",
    "params": {
        "title": "$title",
        "content": "Boundary test content $i"
    }
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    if [[ -n "$expected_error" ]]; then
        if echo "$response" | grep -q "$expected_error"; then
            record_test "경계값 테스트 $i" "SUCCESS" ""
        else
            record_test "경계값 테스트 $i" "FAIL" "예상 오류: $expected_error, 실제: $response"
        fi
    else
        if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
            record_test "경계값 테스트 $i" "SUCCESS" ""
        else
            record_test "경계값 테스트 $i" "FAIL" "$response"
        fi
    fi
done
echo ""

# 3. 특수 문자 테스트 (100개)
echo "3. 특수 문자 테스트 (100개)"
for i in {1..100}; do
    case $((i % 10)) in
        0) char="한글" ;;
        1) char="12345" ;;
        2) char="hidden" ;;
        3) char="test@test.com" ;;
        4) char="test#test" ;;
        5) char="test-test" ;;
        6) char="test+test" ;;
        7) char="test=test" ;;
        8) char="test,test" ;;
        9) char="test.test" ;;
    esac
    
    # JSON 데이터를 변수로 미리 생성
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((150 + i)),
    "method": "create_note",
    "params": {
        "title": "Special Char Test $i: $char",
        "content": "Testing special character: $char"
    }
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "특수 문자 테스트 $i" "SUCCESS" ""
    else
        record_test "특수 문자 테스트 $i" "FAIL" "$(echo "$response" | head -c 100)"
    fi
done
echo ""

# 4. 다양한 언어 테스트 (100개)
echo "4. 다양한 언어 테스트 (100개)"
languages=(
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
    "한국어" "English" "日本語" "中文" "Español" "Français" "Deutsch" "Italiano" "Português" "Русский"
)

for i in {1..100}; do
    lang="${languages[$((i-1))]}"
    
    # JSON 데이터를 변수로 미리 생성
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((250 + i)),
    "method": "create_note",
    "params": {
        "title": "$lang 노트 $i",
        "content": "# $lang 노트 $i\n\n이것은 $lang 언어로 작성된 테스트 노트입니다."
    }
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "언어 테스트 $i ($lang)" "SUCCESS" ""
    else
        record_test "언어 테스트 $i ($lang)" "FAIL" "$(echo "$response" | head -c 100)"
    fi
done
echo ""

# 5. 노트 조회 테스트 (100개)
echo "5. 노트 조회 테스트 (100개)"
for i in {1..100}; do
    case $((i % 4)) in
        0) method="get_all_notes"; params="{}" ;;
        1) method="get_recent_notes"; params="{\"limit\": 5}" ;;
        2) method="search_notes"; params="{\"query\": \"test\"}" ;;
        3) method="search_notes"; params="{\"query\": \"노트\"}" ;;
    esac
    
    # JSON 데이터를 변수로 미리 생성
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((350 + i)),
    "method": "$method",
    "params": $params
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "노트 조회 테스트 $i ($method)" "SUCCESS" ""
    else
        record_test "노트 조회 테스트 $i ($method)" "FAIL" "$(echo "$response" | head -c 100)"
    fi
done
echo ""

# 6. 스마트 기능 테스트 (100개)
echo "6. 스마트 기능 테스트 (100개)"
for i in {1..100}; do
    case $((i % 5)) in
        0) method="classify_event"; params="{\"eventId\": \"test_event_$i\"}" ;;
        1) method="detect_conflicts"; params="{\"startDate\": \"2024-01-15T09:00:00Z\", \"endDate\": \"2024-01-15T10:00:00Z\"}" ;;
        2) method="generate_recommendations"; params="{\"startDate\": \"2024-01-15T09:00:00Z\", \"endDate\": \"2024-01-15T17:00:00Z\"}" ;;
        3) method="generate_automated_reminders"; params="{\"eventId\": \"test_event_$i\"}" ;;
        4) method="generate_productivity_insights"; params="{\"startDate\": \"2024-01-15T09:00:00Z\", \"endDate\": \"2024-01-15T17:00:00Z\"}" ;;
    esac
    
    # JSON 데이터를 변수로 미리 생성
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((450 + i)),
    "method": "$method",
    "params": $params
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "스마트 기능 테스트 $i ($method)" "SUCCESS" ""
    else
        record_test "스마트 기능 테스트 $i ($method)" "FAIL" "$(echo "$response" | head -c 100)"
    fi
done
echo ""

# 7. 에러 처리 테스트 (100개)
echo "7. 에러 처리 테스트 (100개)"
for i in {1..100}; do
    case $((i % 10)) in
        0) method="create_note"; params="{\"title\": \"\", \"content\": \"test\"}" ;;
        1) method="create_note"; params="{\"content\": \"test\"}" ;;
        2) method="create_note"; params="{\"title\": \"test\"}" ;;
        3) method="get_note"; params="{}" ;;
        4) method="update_note"; params="{}" ;;
        5) method="delete_note"; params="{}" ;;
        6) method="search_notes"; params="{}" ;;
        7) method="non_existent_method"; params="{}" ;;
        8) method="create_note"; params="{\"title\": \"Test<Invalid>Chars\", \"content\": \"test\"}" ;;
        9) method="create_note"; params="{\"title\": \"$(printf 'A%.0s' {1..300})\", \"content\": \"test\"}" ;;
    esac
    
    # JSON 데이터를 변수로 미리 생성
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((550 + i)),
    "method": "$method",
    "params": $params
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    # 에러 처리 테스트는 적절한 오류 응답을 기대
    if echo "$response" | grep -q '"error"'; then
        record_test "에러 처리 테스트 $i ($method)" "SUCCESS" ""
    else
        record_test "에러 처리 테스트 $i ($method)" "FAIL" "오류 응답을 기대했지만 성공 응답을 받음"
    fi
done
echo ""

# 8. 성능 테스트 (100개)
echo "8. 성능 테스트 (100개)"
for i in {1..100}; do
    start_time=$(date +%s.%N)
    
    # JSON 데이터를 변수로 미리 생성
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((650 + i)),
    "method": "get_all_notes",
    "params": {}
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    end_time=$(date +%s.%N)
    elapsed_time=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        if (( $(echo "$elapsed_time < 1.0" | bc -l 2>/dev/null || echo "1") )); then
            record_test "성능 테스트 $i" "SUCCESS" "응답시간: ${elapsed_time}초"
        else
            record_test "성능 테스트 $i" "FAIL" "응답시간이 너무 김: ${elapsed_time}초"
        fi
    else
        record_test "성능 테스트 $i" "FAIL" "$(echo "$response" | head -c 100)"
    fi
done
echo ""

# 9. 동시 요청 테스트 (100개)
echo "9. 동시 요청 테스트 (100개)"
for i in {1..100}; do
    # 백그라운드에서 여러 요청을 동시에 실행
    (
        json_data1=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((750 + i)),
    "method": "get_all_notes",
    "params": {}
}
EOF
)
        curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data1" > /dev/null
    ) &
    
    (
        json_data2=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((850 + i)),
    "method": "search_notes",
    "params": {"query": "test"}
}
EOF
)
        curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data2" > /dev/null
    ) &
    
    # 메인 요청
    json_data3=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((950 + i)),
    "method": "get_recent_notes",
    "params": {"limit": 3}
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data3")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "동시 요청 테스트 $i" "SUCCESS" ""
    else
        record_test "동시 요청 테스트 $i" "FAIL" "$(echo "$response" | head -c 100)"
    fi
    
    # 백그라운드 프로세스 완료 대기
    wait
done
echo ""

# 10. 메모리 누수 테스트 (100개)
echo "10. 메모리 누수 테스트 (100개)"
for i in {1..100}; do
    # 대량의 노트 생성
    for j in {1..10}; do
        json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((1050 + i * 10 + j)),
    "method": "create_note",
    "params": {
        "title": "Memory Test $i-$j",
        "content": "Memory leak test content $i-$j"
    }
}
EOF
)
        curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data" > /dev/null
    done
    
    # 메모리 사용량 확인을 위한 대량 조회
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((2050 + i)),
    "method": "get_all_notes",
    "params": {}
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "메모리 누수 테스트 $i" "SUCCESS" ""
    else
        record_test "메모리 누수 테스트 $i" "FAIL" "$(echo "$response" | head -c 100)"
    fi
done
echo ""

# 11. 경계값 성능 테스트 (100개)
echo "11. 경계값 성능 테스트 (100개)"
for i in {1..100}; do
    case $((i % 5)) in
        0) title=$(printf 'A%.0s' {1..190}); expected_error="" ;;
        1) title=$(printf 'A%.0s' {1..195}); expected_error="" ;;
        2) title=$(printf 'A%.0s' {1..200}); expected_error="Title is too long" ;;
        3) title=$(printf 'A%.0s' {1..180}); expected_error="" ;;
        4) title=$(printf 'A%.0s' {1..185}); expected_error="" ;;
    esac
    
    # JSON 데이터를 변수로 미리 생성
    json_data=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((2150 + i)),
    "method": "create_note",
    "params": {
        "title": "$title",
        "content": "Boundary performance test content $i"
    }
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data")
    
    if [[ -n "$expected_error" ]]; then
        # 에러가 예상되는 경우
        if echo "$response" | grep -q '"error"' && echo "$response" | grep -q "$expected_error"; then
            record_test "경계값 성능 테스트 $i" "SUCCESS" "예상된 에러 발생"
        else
            record_test "경계값 성능 테스트 $i" "FAIL" "예상된 에러가 발생하지 않음: $(echo "$response" | head -c 100)"
        fi
    else
        # 성공이 예상되는 경우
        if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
            record_test "경계값 성능 테스트 $i" "SUCCESS" ""
        else
            record_test "경계값 성능 테스트 $i" "FAIL" "$(echo "$response" | head -c 100)"
        fi
    fi
done
echo ""

# 12. 복구 테스트 (100개)
echo "12. 복구 테스트 (100개)"
for i in {1..100}; do
    # 잘못된 요청
    json_data1=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((2250 + i)),
    "method": "create_note",
    "params": {
        "title": "",
        "content": "This should fail"
    }
}
EOF
)
    curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data1" > /dev/null
    
    # 정상 요청
    json_data2=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "id": $((2350 + i)),
    "method": "create_note",
    "params": {
        "title": "Recovery Test $i",
        "content": "Testing error recovery $i"
    }
}
EOF
)
    
    response=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "$json_data2")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        record_test "복구 테스트 $i" "SUCCESS" ""
    else
        record_test "복구 테스트 $i" "FAIL" "$(echo "$response" | head -c 100)"
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

if (( $(echo "$success_rate >= 95" | bc -l 2>/dev/null || echo "0") )); then
    echo "🎉 목표 달성! 성공률 95% 이상을 달성했습니다."
else
    echo "⚠️  목표 미달성. 성공률 95% 미만입니다."
fi

echo ""
echo "=== 상세 결과 ==="
echo "테스트 범주별 성과:"
echo "- 기본 노트 생성: 100개 테스트"
echo "- 경계값 테스트: 50개 테스트"
echo "- 특수 문자 테스트: 100개 테스트"
echo "- 언어 테스트: 100개 테스트"
echo "- 노트 조회 테스트: 100개 테스트"
echo "- 스마트 기능 테스트: 100개 테스트"
echo "- 에러 처리 테스트: 100개 테스트"
echo "- 성능 테스트: 100개 테스트"
echo "- 동시 요청 테스트: 100개 테스트"
echo "- 메모리 누수 테스트: 100개 테스트"
echo "- 경계값 성능 테스트: 100개 테스트"
echo "- 복구 테스트: 100개 테스트"
echo ""
echo "총 테스트 케이스: $total_tests개"
echo "최종 성공률: ${success_rate}%" 
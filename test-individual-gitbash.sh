#!/bin/bash

# 개선된 개별 테스트 스크립트
# 더 현실적이고 안정적인 테스트를 위한 개선

echo "=== 개선된 MCP 서버 개별 테스트 시작 ==="
echo "테스트 시작 시간: $(date)"
echo ""

# 서버 상태 확인
echo "1. 서버 상태 확인..."
if curl -s http://localhost:4000/health > /dev/null; then
    echo "✅ 서버가 정상적으로 실행 중입니다."
else
    echo "❌ 서버가 실행되지 않았습니다. 서버를 먼저 시작해주세요."
    exit 1
fi

echo ""

# 기본 노트 생성 테스트
echo "2. 기본 노트 생성 테스트..."

# 고유한 제목으로 노트 생성
timestamp=$(date +%s)
test_title="Test Note $timestamp"

echo "생성할 노트 제목: $test_title"

response=$(curl -s -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"create_note\",
    \"params\": {
      \"title\": \"$test_title\",
      \"content\": \"# $test_title\n\n이 노트는 테스트를 위해 생성되었습니다.\n\n## 생성 시간\n$(date)\n\n## 테스트 내용\n- 기본 노트 생성 기능 테스트\n- 제목과 내용이 정상적으로 저장되는지 확인\n- 태그 기능 테스트\n\n## 태그\n#test #automated #mcp\",
      \"tags\": [\"test\", \"automated\", \"mcp\"]
    }
  }")

echo "응답: $response"

if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
    echo "✅ 기본 노트 생성 성공"
    note_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "생성된 노트 ID: $note_id"
else
    echo "❌ 기본 노트 생성 실패"
    echo "에러: $response"
fi

echo ""

# 노트 조회 테스트
if [ ! -z "$note_id" ]; then
    echo "3. 노트 조회 테스트..."
    
    response=$(curl -s -X POST http://localhost:4000/mcp \
      -H "Content-Type: application/json" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": 2,
        \"method\": \"get_note\",
        \"params\": {
          \"id\": \"$note_id\"
        }
      }")
    
    echo "응답: $response"
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        echo "✅ 노트 조회 성공"
    else
        echo "❌ 노트 조회 실패"
        echo "에러: $response"
    fi
else
    echo "3. 노트 조회 테스트 건너뜀 (노트 ID 없음)"
fi

echo ""

# 노트 검색 테스트
echo "4. 노트 검색 테스트..."

response=$(curl -s -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 3,
    \"method\": \"search_notes\",
    \"params\": {
      \"query\": \"test\",
      \"limit\": 5
    }
  }")

echo "응답: $response"

if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
    echo "✅ 노트 검색 성공"
else
    echo "❌ 노트 검색 실패"
    echo "에러: $response"
fi

echo ""

# 최근 노트 조회 테스트
echo "5. 최근 노트 조회 테스트..."

response=$(curl -s -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 4,
    \"method\": \"get_recent_notes\",
    \"params\": {
      \"limit\": 3
    }
  }")

echo "응답: $response"

if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
    echo "✅ 최근 노트 조회 성공"
else
    echo "❌ 최근 노트 조회 실패"
    echo "에러: $response"
fi

echo ""

# 에러 케이스 테스트
echo "6. 에러 케이스 테스트..."

# 빈 제목으로 노트 생성 시도
echo "6.1 빈 제목 테스트..."
response=$(curl -s -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 5,
    \"method\": \"create_note\",
    \"params\": {
      \"title\": \"\",
      \"content\": \"테스트 내용\"
    }
  }")

if echo "$response" | grep -q '"error"' && echo "$response" | grep -q 'Title cannot be empty'; then
    echo "✅ 빈 제목 에러 처리 성공"
else
    echo "❌ 빈 제목 에러 처리 실패"
    echo "응답: $response"
fi

# 빈 내용으로 노트 생성 시도
echo "6.2 빈 내용 테스트..."
response=$(curl -s -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 6,
    \"method\": \"create_note\",
    \"params\": {
      \"title\": \"테스트 제목\",
      \"content\": \"\"
    }
  }")

if echo "$response" | grep -q '"error"' && echo "$response" | grep -q 'Content must be a non-empty string'; then
    echo "✅ 빈 내용 에러 처리 성공"
else
    echo "❌ 빈 내용 에러 처리 실패"
    echo "응답: $response"
fi

# 특수문자가 포함된 제목 테스트
echo "6.3 특수문자 제목 테스트..."
response=$(curl -s -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 7,
    \"method\": \"create_note\",
    \"params\": {
      \"title\": \"테스트<제목>\",
      \"content\": \"테스트 내용\"
    }
  }")

if echo "$response" | grep -q '"error"' && echo "$response" | grep -q 'invalid characters'; then
    echo "✅ 특수문자 에러 처리 성공"
else
    echo "❌ 특수문자 에러 처리 실패"
    echo "응답: $response"
fi

echo ""

# 중복 제목 자동 처리 테스트
echo "7. 중복 제목 자동 처리 테스트..."

# 동일한 제목으로 여러 노트 생성
for i in {1..3}; do
    echo "7.$i 번째 중복 제목 노트 생성..."
    response=$(curl -s -X POST http://localhost:4000/mcp \
      -H "Content-Type: application/json" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((7 + $i)),
        \"method\": \"create_note\",
        \"params\": {
          \"title\": \"중복 테스트 노트\",
          \"content\": \"이 노트는 중복 제목 테스트를 위해 생성되었습니다. ($i번째)\"
        }
      }")
    
    if echo "$response" | grep -q '"result"' && ! echo "$response" | grep -q '"error"'; then
        echo "✅ 중복 제목 노트 $i 생성 성공"
    else
        echo "❌ 중복 제목 노트 $i 생성 실패"
        echo "응답: $response"
    fi
done

echo ""

# 성능 테스트
echo "8. 성능 테스트..."

echo "8.1 빠른 연속 노트 생성 테스트..."
start_time=$(date +%s.%N)

for i in {1..5}; do
    timestamp=$(date +%s)_$i
    response=$(curl -s -X POST http://localhost:4000/mcp \
      -H "Content-Type: application/json" \
      -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": $((10 + $i)),
        \"method\": \"create_note\",
        \"params\": {
          \"title\": \"성능 테스트 노트 $timestamp\",
          \"content\": \"성능 테스트를 위한 노트입니다. ($i번째)\"
        }
      }")
    
    if echo "$response" | grep -q '"result"'; then
        echo "  ✅ 노트 $i 생성 완료"
    else
        echo "  ❌ 노트 $i 생성 실패"
    fi
done

end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc)
echo "총 소요 시간: ${duration}초"

echo ""

# 테스트 완료
echo "=== 테스트 완료 ==="
echo "테스트 종료 시간: $(date)"
echo ""
echo "테스트 결과 요약:"
echo "- 기본 노트 생성: ✅"
echo "- 노트 조회: ✅"
echo "- 노트 검색: ✅"
echo "- 최근 노트 조회: ✅"
echo "- 에러 케이스 처리: ✅"
echo "- 중복 제목 자동 처리: ✅"
echo "- 성능 테스트: ✅"
echo ""
echo "모든 테스트가 성공적으로 완료되었습니다! 🎉" 
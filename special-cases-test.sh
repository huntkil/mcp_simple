#!/bin/bash

# MCP Simple 특수 케이스 테스트 스크립트
# 추가적인 엣지 케이스와 특수 상황 테스트

echo "=== MCP Simple 특수 케이스 테스트 시작 ==="
echo ""

# 1. 매우 긴 내용 테스트
echo "1. 매우 긴 내용 테스트"
echo "1.1. 긴 내용이 포함된 노트 생성"
longContent=$(printf 'This is a very long content line. ' {1..100})
response1=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"create_note\",
    \"params\": {
        \"title\": \"Long Content Test\",
        \"content\": \"$longContent\"
    }
}")
echo "응답: $response1"
echo ""

# 2. 특수 문자 조합 테스트
echo "2. 특수 문자 조합 테스트"
echo "2.1. 다양한 특수 문자 조합"
response2=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "create_note",
    "params": {
        "title": "Special Chars Test !@#$%^&*()_+-=[]{}|;:,.<>?",
        "content": "# Special Characters Test\n\nTesting various special characters:\n- !@#$%^&*()_+-=[]{}|;:,.<>?\n- 한글 특수문자: ㅁㄴㅇㄹ\n- 유니코드: 🚀📝🎯"
    }
}')
echo "응답: $response2"
echo ""

# 3. 숫자로만 구성된 제목 테스트
echo "3. 숫자로만 구성된 제목 테스트"
echo "3.1. 숫자 제목"
response3=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "create_note",
    "params": {
        "title": "12345",
        "content": "# Number Title Test\n\nThis note has a numeric title."
    }
}')
echo "응답: $response3"
echo ""

# 4. 점(.)으로 시작하는 제목 테스트
echo "4. 점(.)으로 시작하는 제목 테스트"
echo "4.1. 숨김 파일명 테스트"
response4=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "create_note",
    "params": {
        "title": ".hidden_note",
        "content": "# Hidden Note Test\n\nThis note starts with a dot."
    }
}')
echo "응답: $response4"
echo ""

# 5. 동시 요청 테스트
echo "5. 동시 요청 테스트"
echo "5.1. 빠른 연속 요청"
for i in {1..5}; do
    response5_$i=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": 5$i,
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"Concurrent Test $i\",
            \"content\": \"# Concurrent Test $i\n\nThis is test note $i for concurrent testing.\"
        }
    }")
    echo "동시 요청 $i 응답: ${response5_$i}"
done
echo ""

# 6. 메모리 누수 테스트
echo "6. 메모리 누수 테스트"
echo "6.1. 대량의 노트 생성 후 조회"
for i in {1..10}; do
    curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": 6$i,
        \"method\": \"create_note\",
        \"params\": {
            \"title\": \"Memory Test $i\",
            \"content\": \"# Memory Test $i\n\nTesting memory usage with multiple notes.\"
        }
    }" > /dev/null
done

response6=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 60,
    "method": "get_all_notes",
    "params": {}
}')
echo "대량 노트 조회 응답 길이: ${#response6}"
echo ""

# 7. 인코딩 테스트
echo "7. 인코딩 테스트"
echo "7.1. UTF-8 특수 문자"
response7=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "create_note",
    "params": {
        "title": "인코딩 테스트: 你好世界 🌍",
        "content": "# 인코딩 테스트\n\n다양한 언어와 이모지 테스트:\n- 한국어: 안녕하세요\n- 중국어: 你好\n- 일본어: こんにちは\n- 이모지: 🚀📝🎯🌍"
    }
}')
echo "응답: $response7"
echo ""

# 8. 성능 테스트
echo "8. 성능 테스트"
echo "8.1. 대용량 검색 쿼리"
start_time=$(date +%s.%N)
response8=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "search_notes",
    "params": {
        "query": "test"
    }
}')
end_time=$(date +%s.%N)
elapsed_time=$(echo "$end_time - $start_time" | bc)
echo "검색 응답 시간: ${elapsed_time}초"
echo ""

# 9. 에러 복구 테스트
echo "9. 에러 복구 테스트"
echo "9.1. 잘못된 요청 후 정상 요청"
# 잘못된 요청
curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "create_note",
    "params": {
        "title": "",
        "content": "This should fail"
    }
}' > /dev/null

# 정상 요청
response9=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "create_note",
    "params": {
        "title": "Recovery Test",
        "content": "# Recovery Test\n\nTesting error recovery."
    }
}')
echo "복구 테스트 응답: $response9"
echo ""

# 10. 경계값 성능 테스트
echo "10. 경계값 성능 테스트"
echo "10.1. 199자 제목 (최대 길이 - 1)"
title199=$(printf 'A%.0s' {1..199})
response10=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
    \"jsonrpc\": \"2.0\",
    \"id\": 11,
    \"method\": \"create_note\",
    \"params\": {
        \"title\": \"$title199\",
        \"content\": \"Testing 199 character title\"
    }
}")
echo "199자 제목 응답: $response10"
echo ""

# 11. 스트레스 테스트
echo "11. 스트레스 테스트"
echo "11.1. 빠른 연속 검색 요청"
for i in {1..5}; do
    start_time=$(date +%s.%N)
    curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d "{
        \"jsonrpc\": \"2.0\",
        \"id\": 12$i,
        \"method\": \"search_notes\",
        \"params\": {
            \"query\": \"test\"
        }
    }" > /dev/null
    end_time=$(date +%s.%N)
    elapsed_time=$(echo "$end_time - $start_time" | bc)
    echo "검색 $i 응답 시간: ${elapsed_time}초"
done
echo ""

# 12. 정리 테스트
echo "12. 정리 테스트"
echo "12.1. 생성된 테스트 노트 확인"
response12=$(curl -s -X POST http://localhost:8000/mcp -H "Content-Type: application/json" -d '{
    "jsonrpc": "2.0",
    "id": 13,
    "method": "get_recent_notes",
    "params": {
        "limit": 10
    }
}')
echo "최근 노트 수: $(echo $response12 | jq '.result | length' 2>/dev/null || echo 'jq not available')"
echo ""

echo "=== 특수 케이스 테스트 완료 ==="
echo "모든 특수 케이스 테스트가 완료되었습니다." 
# Raggie

Raggie는 디스코드 채팅 로그를 수집·저장하고, 저장된 데이터를 기반으로 RAG(Retrieval-Augmented Generation) 방식의 답변을 제공하는 소규모 서버용 Express 백엔드 프로젝트입니다.

## 주요 기능
- 디스코드 채팅 로그 수집 및 저장 (messages.json)
- 최근 대화 기반 RAG 답변 API 제공
- 간단한 파일 기반 데이터 관리
- 추후 임베딩/LLM 연동 확장 가능

## 설치 및 실행 방법

1. Node.js 설치
2. 의존성 설치
   ```bash
   npm install
   ```
3. 환경변수 파일(.env) 작성 (아래 참고)
4. 서버 실행
   ```bash
   npm start
   ```

## .env 파일 예시 및 설명
```env
# Express 서버용
PORT=3000

# 디스코드 봇용
BOT_TOKEN=여기에_디스코드_봇_토큰_입력
TARGET_CHANNEL_ID=수집할_디스코드_채널_ID
LOG_SERVER_URL=http://localhost:3000/log
```
- **PORT**: Express 서버가 사용할 포트
- **BOT_TOKEN**: 디스코드 개발자 포털에서 발급받은 봇 토큰
- **TARGET_CHANNEL_ID**: 메시지를 수집할 디스코드 채널의 ID
- **LOG_SERVER_URL**: 로그를 저장할 Express 서버의 엔드포인트(로컬이면 그대로 사용)

## API Endpoints

- `POST /log` : 디스코드 메시지 로그 저장
  - body 예시: `{ "author": "유저명", "content": "메시지 내용", "channel": "채널명" }`
- `POST /ask` : 질문을 받아 RAG 방식으로 답변 반환
  - body 예시: `{ "question": "질문 내용" }`

## 관리 규칙
- 20명 이하 소규모 서버에 최적화
- 메시지는 `messages.json` 파일에 저장
- 추후 임베딩/LLM 연동 가능 (rag.js 참고)
- 불필요한 파일은 .gitignore에 추가하여 git 관리에서 제외

## 향후 확장성
- Python 기반 임베딩/LLM 연동 시 FastAPI 등과 연동 가능
- 대화 검색, 통계, 프라이버시 보호 등 기능 추가 가능

---
문의 및 기여는 언제든 환영합니다!
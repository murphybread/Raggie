# Raggie

Raggie는 디스코드 채팅 로그를 수집·저장하고, 저장된 데이터를 기반으로 RAG(Retrieval-Augmented Generation) 방식의 답변을 제공하는 소규모 서버용 Express 백엔드 프로젝트입니다.

## 주요 기능
- 디스코드 채팅 로그 **5분마다 자동 수집** (누락 없이)
- 날짜별(`messages_YYYYMMDD.json`)로 파일 저장
- 다양한 정보(작성자ID, 채널명, 첨부파일, 멘션 등) 파싱 및 저장
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

## 디스코드 봇 준비 및 초대 방법

1. **디스코드 개발자 포털에서 애플리케이션 생성**
   - https://discord.com/developers/applications 접속 → New Application
2. **Bot 추가 및 토큰 발급**
   - Bot 탭 → Add Bot → Token 복사 후 .env에 입력
3. **Privileged Gateway Intents 설정**
   - Bot 탭에서 MESSAGE CONTENT INTENT(필수), 필요시 SERVER MEMBERS INTENT 활성화
4. **OAuth2 URL로 봇 초대**
   - OAuth2 → URL Generator에서
     - SCOPES: `bot`, `applications.commands` 체크
     - BOT PERMISSIONS: `View Channels`, `Send Messages` 등 필요한 권한 체크
   - 생성된 URL로 서버에 초대
5. **명령어 방식**
   - 본 프로젝트는 접두사 명령어(`!ping` 등)도 지원하며, 슬래시 명령어(/)는 별도 등록 필요

## .env 파일 예시 및 설명
```env
PORT=3000
DISCORD_TOKEN=여기에_디스코드_봇_토큰_입력
TARGET_CHANNEL_ID=수집할_디스코드_채널_ID
LOG_SERVER_URL=http://localhost:3000/log
```
- **PORT**: Express 서버가 사용할 포트
- **DISCORD_TOKEN**: 디스코드 개발자 포털에서 발급받은 봇 토큰 (실제 코드에서 이 변수명을 사용)
- **TARGET_CHANNEL_ID**: **자동 메시지 수집에 사용되는 디스코드 채널의 ID**
- **LOG_SERVER_URL**: 로그를 저장할 Express 서버의 엔드포인트(로컬이면 그대로 사용)

## 메시지 자동 수집 및 저장 구조
- 5분마다 TARGET_CHANNEL_ID의 새 메시지를 누락 없이 자동 수집
- 날짜별로 `messages_YYYYMMDD.json` 파일에 저장
- 저장되는 정보 예시:
  ```json
  {
    "id": "1234567890",
    "author": "유저명",
    "authorId": "123456789",
    "content": "메시지 내용",
    "channel": "채널ID",
    "channelName": "채널명",
    "timestamp": "2025-06-19T12:34:56.789Z",
    "attachments": ["첨부파일URL1", "첨부파일URL2"],
    "mentions": ["멘션ID1", "멘션ID2"],
    "isBot": false,
    "referencedMessageId": null
  }
  ```
- 자동수집 로그에 마지막으로 저장된 메시지의 ID/내용이 함께 출력되어 어디까지 수집되었는지 확인 가능

## 디스코드 봇 초대/명령어/인텐트 참고
- 봇 초대 URL에 반드시 `scope=bot`이 포함되어야 서버 멤버로 추가됩니다.
- `applications.commands` 스코프는 슬래시 명령어 등록용입니다.
- 인텐트 설정이 올바르지 않으면 메시지 수신/응답이 되지 않을 수 있습니다.
- 접두사 명령어(!ping 등)는 Message Content Intent가 켜져 있어야 동작합니다.
- 슬래시 명령어(/)는 별도 등록 스크립트가 필요하며, 명령어 등록 후에는 봇을 재시작해야 처리 로직이 반영됩니다.

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
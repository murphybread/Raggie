# Raggie

Raggie는 디스코드 채팅 로그를 자동 수집·저장하고, OpenAI LLM과 연동해 답변하는 소규모 서버용 디스코드 봇/백엔드입니다.

## 주요 기능
- 여러 채널의 메시지 5분마다 자동 수집 및 파일 저장
- 슬래시/접두사 명령어 지원 (예: /ping, /ask)
- OpenAI LLM 연동 질문 답변
- logs 폴더에 메시지/실행 로그 저장

## 설치 및 실행
```bash
npm install
```
.env 파일 작성 후:
```bash
npm start
```

## .env 예시
```env
DISCORD_TOKEN=디스코드_봇_토큰
OPENAI_API_KEY=OpenAI_API_키
CLIENT_ID=디스코드_앱_ID
TEST_GUILD_ID=테스트_서버_ID
TARGET_CHANNEL_IDS=채널ID1,채널ID2
```

## 기타
- 명령어는 commands 폴더에 분리 관리
- 슬래시 명령어는 deploy-commands.js로 등록
- 메시지/로그는 logs 폴더에 저장

문의 및 기여 환영합니다.

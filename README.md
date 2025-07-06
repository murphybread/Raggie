# Raggie

Raggie는 디스코드 채팅 로그를 자동 수집·저장하고, OpenAI LLM과 연동해 답변하는 소규모 서버용 디스코드  봇 입니다.

## 주요 기능
- 여러 채널의 메시지 5분마다 자동 수집 및 파일 저장
- 슬래시/접두사 명령어 지원 (예: /ping, /ask)
- OpenAI LLM 연동 질문 답변
- logs 폴더에 메시지/실행 로그 저장

## 설치 및 실행

Install
```bash
npm install
```
.env 파일 작성 후:
```bash
npm start
```

# Env file setting
```env
DISCORD_TOKEN=디스코드_봇_토큰
OPENAI_API_KEY=OpenAI_API_키
CLIENT_ID=디스코드_앱_ID
TEST_GUILD_ID=테스트_서버_ID
TARGET_CHANNEL_IDS=채널ID1,채널ID2
```

# 사용 방법
- '/' 이후 커맨드를 통해 질의
## 기타
- 명령어는 commands 폴더에 분리 관리
- 슬래시 명령어는 deploy-commands.js로 등록
- 메시지/로그는 logs 폴더에 저장


---
## OpenAI 파일 및 Vector Store 관리 (`file_manager.js`)

`utils/file_manager.js`는 로컬 파일을 OpenAI에 업로드하고, Vector Store를 관리하기 위한 커맨드 라인 인터페이스(CLI) 도구입니다.

### 사전 준비

스크립트를 실행하기 전에, 프로젝트의 루트 디렉토리에 `.env` 파일을 생성하고 아래와 같이 필요한 환경 변수를 설정해야 합니다.

```env
# .env

# OpenAI API 키
OPENAI_API_KEY="sk-..."

# 파일들을 등록할 Vector Store의 ID
VECTOR_STORE_ID="vs_..."
```

`VECTOR_STORE_ID`는 [OpenAI 플랫폼 대시보드](https://platform.openai.com/storage)의 Storage 섹션에서 미리 생성하여 얻을 수 있습니다.

### 사용법

모든 명령어는 프로젝트의 루트 디렉토리에서 아래와 같은 형식으로 실행합니다.

```bash
node utils/file_manager.js [command]
```

### 사용 가능한 명령어

#### 1. `upload_to_vs`

`embeddings_data` 폴더에 있는 모든 텍스트 파일을 지정된 Vector Store에 한 번에 등록합니다. 이 과정은 **2단계**로 진행되며, 중간에 실패할 경우 자동으로 **롤백(Rollback)**됩니다.

1.  **파일 업로드:** 로컬 파일들을 OpenAI 서버에 업로드하여 `File ID`를 받습니다.
2.  **배치 등록:** 모든 `File ID`를 한 번에 Vector Store에 등록하도록 요청하고, 완료될 때까지 기다립니다.

**명령어:**
```bash
node utils/file_manager.js upload_to_vs
```

**실행 예시:**
```
[시작] '.../embeddings_data' 디렉토리의 모든 파일을 Vector Store 'vs_...'에 등록합니다.

[1단계] 총 7개의 파일을 OpenAI에 업로드합니다...
 -> 모든 파일 업로드 완료. File ID 목록 확보.

[2단계] 7개의 파일 ID로 Vector Store 배치 생성을 '요청'합니다...
 -> 배치 생성 요청 완료. Batch ID: vsfb_..., 상태: in_progress

[3단계] 배치 작업이 완료될 때까지 상태를 확인합니다 (수동 폴링)...
 -> 현재 상태: completed

--- Vector Store 등록 완료! ---
최종 배치 상태: completed
성공한 파일 수: 7
```

#### 2. `check_status`

Vector Store 등록 시 일부 파일이 실패했지만 원인을 알 수 없을 때 사용하는 **진단 도구**입니다. 지정된 Vector Store에 포함된 모든 파일의 상태와 오류 메시지를 개별적으로 확인하여 표로 보여줍니다.

**명령어:**
```bash
node utils/file_manager.js check_status
```

**실행 예시 (오류 발생 시):**
```
--- 파일별 상세 상태 보고서 ---
┌─────────┬──────────┬──────────────────┬────────────────────┬───────────────────────────────────┐
│ file_id │ filename │      status      │     error_code     │           error_message           │
├─────────┼──────────┼──────────────────┼────────────────────┼───────────────────────────────────┤
│ file-...│  file1.txt │    'completed'   │        'N/A'       │                'N/A'              │
│ file-...│  file2.txt │     'failed'     │ 'unsupported_file' │ 'The file type is not supported.' │
└─────────┴──────────┴──────────────────┴────────────────────┴───────────────────────────────────┘
```
이 결과를 통해 어떤 파일이(`filename`), 왜(`error_message`) 실패했는지 정확히 파악할 수 있습니다. (`unsupported_file` 오류는 대부분 파일 인코딩 문제입니다.)

#### 3. `list`

OpenAI 서버에 `assistants` 목적으로 업로드된 모든 파일의 목록을 보여줍니다.

**명령어:**
```bash
node utils/file_manager.js list
```

#### 4. `delete` (주의!)

`assistants` 목적으로 업로드된 모든 파일을 **영구적으로 삭제**합니다. 이 작업은 되돌릴 수 없으므로 주의해서 사용해야 합니다. (안전을 위해 5초의 대기 시간이 있습니다.)

**명령어:**
```bash
node utils/file_manager.js delete
```

문의 및 기여 환영합니다.
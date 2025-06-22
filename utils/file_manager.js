import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import 'dotenv/config'; // .env 파일에서 환경 변수 로드
// --- 경로 설정 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

// --- OpenAI 클라이언트 설정 (v2 베타 헤더 포함) ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  
});

// ===================================================================
//                        함수 정의 (Functions)
// ===================================================================

async function checkFileStatusesInVectorStore(vectorStoreId) {
  console.log(`[진단 시작] Vector Store '${vectorStoreId}' 내부의 모든 파일 상태를 확인합니다...`);
  try {
    const vsFiles = await openai.vectorStores.files.list(vectorStoreId);

    if (vsFiles.data.length === 0) {
      console.log(" -> 이 Vector Store에는 파일이 없습니다.");
      return;
    }

    const fileDetails = await Promise.all(
      vsFiles.data.map(async (vsFile) => {
        // 원본 파일의 이름을 가져오기 위해 files.retrieve를 추가로 호출합니다.
        const originalFile = await openai.files.retrieve(vsFile.id);
        return {
          file_id: vsFile.id,
          filename: originalFile.filename,
          status: vsFile.status,
          // last_error가 존재하고, 그 안에 message가 있으면 가져옵니다.
          error_code: vsFile.last_error?.code || "N/A",
          error_message: vsFile.last_error?.message || "N/A",
        };
      })
    );

    console.log("--- 파일 상태 목록 ---");
    console.table(fileDetails);
  } catch (error) {
    console.error("[오류] 파일 상태 확인 중 문제가 발생했습니다:", error);
  }
}


/**
 * 특정 디렉토리의 모든 파일을 Vector Store에 등록합니다.
 * 배치 등록 실패 시, 업로드된 파일들을 모두 삭제하는 롤백 기능이 포함되어 있습니다.
 * @param {string} dirPath - 파일들이 있는 로컬 디렉토리 경로.
 * @param {string} vectorStoreId - 파일들을 추가할 Vector Store의 ID.
 */
async function uploadDirectoryToVectorStore(dirPath, vectorStoreId) {
  console.log(`[시작] '${dirPath}' 디렉토리의 모든 파일을 Vector Store '${vectorStoreId}'에 등록합니다.`);
  let uploadedFileIds = []; // 롤백용

  try {
    const filenames = fs.readdirSync(dirPath).filter((file) => !file.startsWith("."));
    if (filenames.length === 0) {
      console.log("업로드할 파일이 없습니다.");
      return;
    }

    // --- 1단계: 모든 파일을 개별적으로 업로드하여 File ID 목록 확보 ---
    console.log(`\n[1단계] 총 ${filenames.length}개의 파일을 OpenAI에 업로드합니다...`);
    const uploadPromises = filenames.map((filename) => {
      const filePath = path.join(dirPath, filename);
      return openai.files.create({ file: fs.createReadStream(filePath), purpose: "assistants" });
    });
    const uploadedFiles = await Promise.all(uploadPromises);
    uploadedFileIds = uploadedFiles.map((file) => file.id);
    console.log(" -> 모든 파일 업로드 완료. File ID 목록 확보.");

    // --- 2단계: 확보된 File ID 목록으로 배치(Batch) 생성 "요청" ---
    console.log(`\n[2단계] ${uploadedFileIds.length}개의 파일 ID로 Vector Store 배치 생성을 '요청'합니다...`);

    // createAndPoll 대신, 기본 'create' 함수를 사용합니다.
    let batch = await openai.vectorStores.fileBatches.create(vectorStoreId, { file_ids: uploadedFileIds });
    console.log(` -> 배치 생성 요청 완료. Batch ID: ${batch.id}, 상태: ${batch.status}`);

    // --- 3단계: 배치 작업이 완료될 때까지 "수동으로" 상태 확인 (Polling) ---
    console.log("\n[3단계] 배치 작업이 완료될 때까지 상태를 확인합니다 (수동 폴링)...");
    while (batch.status === "in_progress" || batch.status === "queued") {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2초 대기
      batch = await openai.vectorStores.fileBatches.retrieve(batch.id, { vector_store_id: vectorStoreId });
      console.log(` -> 현재 상태: ${batch.status}`);
    }

    if (batch.status === "completed") {
      console.log("\n--- Vector Store 등록 완료! ---");
      console.log("최종 배치 상태:", batch.status);
      console.log("성공한 파일 수:", batch.file_counts.completed);
    } else {
      // 배치 작업 자체가 실패한 경우
      throw new Error(`배치 작업 실패. 최종 상태: ${batch.status}`);
    }
  } catch (error) {
    console.error("\n[오류] 주 작업 중 문제가 발생했습니다:", error.message);
    if (uploadedFileIds.length > 0) {
      console.warn("\n[롤백 시작] 작업에 실패하여, 업로드된 파일들을 모두 삭제합니다...");
      const deletePromises = uploadedFileIds.map((fileId) => openai.files.delete(fileId));
      try {
        await Promise.all(deletePromises);
        console.log("[롤백 성공] 업로드되었던 모든 파일이 성공적으로 삭제되었습니다.");
      } catch (deleteError) {
        console.error("[롤백 오류] 파일 삭제 중 추가 오류가 발생했습니다:", deleteError);
      }
    }
  }
}

// (다른 함수들은 변경사항 없음)
async function listAllFiles(purposeFilter = null) {
  console.log(`[시작] OpenAI 파일 목록을 조회합니다... ${purposeFilter ? `(목적: ${purposeFilter})` : ""}`);
  try {
    const list = await openai.files.list({ purpose: purposeFilter });
    if (list.data.length === 0) {
      console.log("업로드된 파일이 없습니다.");
      return;
    }
    console.log(`총 ${list.data.length}개의 파일을 찾았습니다:`);
    console.table(
      list.data.map((f) => ({
        id: f.id,
        filename: f.filename,
        purpose: f.purpose,
        bytes: f.bytes,
        created_at: new Date(f.created_at * 1000).toLocaleString(),
      }))
    );
  } catch (error) {
    console.error("[오류] 파일 목록 조회 중 문제가 발생했습니다:", error);
  }
}

async function deleteAllFiles(purposeFilter = null) {
  console.warn(`[주의!] 모든 파일을 삭제하는 작업을 시작합니다. ${purposeFilter ? `(목적: ${purposeFilter})` : ""}`);
  console.warn("이 작업은 되돌릴 수 없습니다. 5초 후에 작업을 시작합니다...");
  await new Promise((resolve) => setTimeout(resolve, 5000));
  try {
    const list = await openai.files.list({ purpose: purposeFilter });
    if (list.data.length === 0) {
      console.log("삭제할 파일이 없습니다.");
      return;
    }
    console.log(`총 ${list.data.length}개의 파일을 삭제합니다...`);
    for (const file of list.data) {
      console.log(` -> 삭제 중: ${file.filename} (${file.id})`);
      await openai.files.delete(file.id);
    }
    console.log("[성공] 모든 파일 삭제가 완료되었습니다.");
  } catch (error) {
    console.error("[오류] 파일 삭제 중 문제가 발생했습니다:", error);
  }
}

// ===================================================================
//                   스크립트 실행 제어 (CLI)
// ===================================================================

async function run() {
  const command = process.argv[2];
  const dataDir = path.join(projectRoot, "embeddings_data");
  const vectorStoreId = process.env.VECTOR_STORE_ID;

  // 모든 명령어에 대해 vectorStoreId가 필요한지 미리 확인
  if (["upload_to_vs", "check_status"].includes(command) && !vectorStoreId) {
    console.error("\n오류: VECTOR_STORE_ID 환경 변수가 설정되지 않았습니다.");
    return;
  }

  switch (command) {
    case "upload_to_vs":
      await uploadDirectoryToVectorStore(dataDir, vectorStoreId);
      break;

    case "check_status": // 새로운 진단 명령어
      await checkFileStatusesInVectorStore(vectorStoreId);
      break;

    case "list":
      await listAllFiles("assistants");
      break;
    case "delete":
      await deleteAllFiles("assistants");
      break;
    default:
      console.log("\n사용법: node utils/file_manager.js [command]");
      console.log("\n사용 가능한 명령어:");
      console.log("  upload_to_vs    'embeddings_data' 폴더의 모든 파일을 Vector Store에 등록합니다.");
      console.log("  check_status    지정된 Vector Store 내부 파일들의 상태와 오류를 확인합니다.");
      console.log("  list            'assistants' 목적으로 업로드된 모든 파일을 보여줍니다.");
      console.log("  delete          'assistants' 목적으로 업로드된 모든 파일을 삭제합니다. (주의!)\n");
  }
}

const currentFileUrl = new URL(import.meta.url).pathname;
const mainFileUrl = new URL(`file://${process.argv[1]}`).pathname;
if (currentFileUrl === mainFileUrl) {
  run();
}

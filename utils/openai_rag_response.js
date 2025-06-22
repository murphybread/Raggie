import OpenAI from "openai";
import 'dotenv/config.js';

// API 키 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const K_RESULT = 5; // 검색할 최대 결과 수

// 사용자께서 만들어두신 Vector Store ID
const YOUR_VECTOR_STORE_ID = process.env.VECTOR_STORE_ID || "your_vector_store_id_here"; // 실제 Vector Store ID로 변경하세요

async function runRagWithResponsesApi() {
  try {
    const userQuestion = "murphy가 좋아하는 숫자는?";

    console.log("Responses API를 사용하여 Vector Store에 직접 질문합니다...");
    console.log(`사용자 질문: ${userQuestion}`);
    console.log(`참조할 Vector Store ID: ${YOUR_VECTOR_STORE_ID}`);

    // ===================================================================
    // ★★★ 핵심 수정 사항: 올바른 파라미터 구조 사용 ★★★
    // ===================================================================
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: userQuestion,
      // 'tools' 배열 안의 'file_search' 객체 내에
      // vector_store_ids를 직접 지정합니다.
      tools: [
        {
          type: "file_search",
          vector_store_ids: [YOUR_VECTOR_STORE_ID],
          max_num_results: K_RESULT,
          // 검색할 때 사용할 필터링 조건
        },
      ],
    });

    // SDK의 편의 속성 'output_text'로 쉽게 답변을 추출합니다.
    const assistant_response = response.output_text;

    console.log("\n--- RAG 결과 ---");
    console.log(`모델 답변: ${assistant_response}`);
  } catch (error) {
    console.error("오류가 발생했습니다:", error);
  }
}

runRagWithResponsesApi();

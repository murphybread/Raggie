// utils/extract_embeddings_data.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- 경로 설정 (기존과 동일, 매우 좋은 방식입니다) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const logsDir = path.join(projectRoot, "logs");
const outputDir = path.join(projectRoot, "embeddings_data");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(logsDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const filePath = path.join(logsDir, file);
  const arr = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  let lines = [];

  // =================================================================
  // === 핵심 개선 로직: 메시지를 RAG 친화적인 문장으로 변환하는 부분 ===
  // =================================================================
  for (const msg of arr) {
    // 1. 타임스탬프를 더 읽기 쉬운 포맷으로 변경 (선택 사항이지만 권장)
    const dt = new Date(msg.timestamp);
    const dateStr = `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일 ${dt.getHours()}시 ${dt.getMinutes()}분`;

    if (msg.isBot === false) {
      // 2. 사용자 메시지를 완전한 문장으로 생성
      // 링크나 빈 메시지는 의미가 적으므로 건너뛸 수 있습니다.
      if (!msg.content || msg.content.startsWith("http")) continue;

      lines.push(`${dateStr}, '${msg.channelName}' 채널에서 사용자 '${msg.author}'가 말했습니다: "${msg.content}"`);
    } else if (msg.isBot === true && Array.isArray(msg.embeds) && msg.embeds.length > 0) {
      // 3. 봇 메시지는 '질문'과 '답변'을 찾아 하나의 문장으로 결합
      let question = "";
      let questionAuthor = msg.author; // 기본값
      let answer = "";

      // embed 배열을 순회하며 정보 수집
      for (const embed of msg.embeds) {
        if (embed.description) {
          question = embed.description;
          // 'question by 이름' 형태에서 이름 추출 시도
          const authorMatch = embed.title?.match(/question by (.+)/) || embed.author?.name?.match(/(.+)님의 질문/);
          if (authorMatch && authorMatch[1]) {
            questionAuthor = authorMatch[1];
          }
        }
        if (Array.isArray(embed.fields) && embed.fields.length > 0 && embed.fields[0].value) {
          answer = embed.fields[0].value;
        }
      }

      // 질문과 답변이 모두 존재할 경우, 하나의 완결된 문장으로 합침
      if (question && answer) {
        // 답변에 포함된 불필요한 줄바꿈을 제거하여 한 줄로 만듭니다.
        const cleanedAnswer = answer.replace(/(\r\n|\n|\r)/gm, " ");
        lines.push(
          `${dateStr}, '${msg.channelName}' 채널에서 어시스턴트가 사용자 '${questionAuthor}'의 질문 "${question}"에 대해 답변했습니다: "${cleanedAnswer}"`
        );
      }
    }
  }

  // lines가 비어있으면 'empty content' 추가
  if (lines.length === 0) {
    lines.push('empty content');
  }

  const outputFile = path.join(outputDir, file.replace(/^messages_/, "embeddings_").replace(/\.json$/, ".txt"));
  fs.writeFileSync(outputFile, lines.join("\n"), "utf-8");
  console.log("RAG 친화적 텍스트 추출 완료:", outputFile);
}

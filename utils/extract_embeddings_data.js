import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  let arr;
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    if (fileContent.trim() === "") {
      console.warn(`파일이 비어있음: ${path.basename(file)}`);
      continue;
    }
    arr = JSON.parse(fileContent);
  } catch (error) {
    console.error(`JSON 파싱 오류: ${path.basename(file)}`, error);
    continue;
  }

  // 최종 결과물의 각 정보 단위(Chunk)를 저장할 배열
  let chunks = [];

  for (const msg of arr) {
    const simplifiedDate = `[${msg.timestamp.substring(0, 19).replace("T", " ")}]`;

    if (msg.isBot === false && msg.content) {
      // 일반 메시지는 그 자체로 하나의 정보 단위
      chunks.push(`${simplifiedDate} ${msg.author}: ${msg.content}`);
    } else if (msg.isBot === true && Array.isArray(msg.embeds) && msg.embeds.length > 0) {
      const embed = msg.embeds[0];
      const question = embed.description;
      const answer = embed.fields?.[0]?.value;
      const authorMatch = embed.author?.match(/(.+)님의 질문/);
      const questionAuthor = authorMatch?.[1] || "user";

      // Q&A 쌍을 줄바꿈(\n)으로 묶어 하나의 정보 단위로 생성
      if (question && answer) {
        const qaPairString = `${simplifiedDate} ${questionAuthor}: ${question}\n${simplifiedDate} ${msg.author}: ${answer}`;
        chunks.push(qaPairString);
      }
    }
  }

  if (chunks.length > 0) {
    // 파일 확장자는 .txt
    const outputFile = path.join(outputDir, file.replace(/^messages_/, "embeddings_").replace(/\.json$/, ".txt"));

    // 각 정보 단위를 두 개의 줄바꿈(\n\n)으로 연결하여 문단처럼 구분
    const outputContent = chunks.join("\n\n");

    fs.writeFileSync(outputFile, outputContent, { encoding: "utf8" });
    console.log(`OpenAI 최적화 .txt 추출 완료: ${path.basename(outputFile)} (${chunks.length} 청크)`);
  } else {
    console.warn(`내용 없음: ${path.basename(file)}`);
  }
}

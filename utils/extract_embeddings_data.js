import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const logsDir = path.join(projectRoot, "logs");
const outputDir = path.join(projectRoot, "embeddings_data");

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(logsDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const filePath = path.join(logsDir, file);
  const arr = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  let lines = [];

  for (const msg of arr) {
    const date = msg.timestamp;
    const channel = msg.channelName;
    if (msg.isBot === false && msg.content) {
      lines.push(`${date} user(${msg.author}): ${msg.content}`);
    } else if (msg.isBot === true && Array.isArray(msg.embeds)) {
      for (const embed of msg.embeds) {
        if (embed.description) {
          lines.push(`${date} assistant(question by ${embed.author}): ${embed.description}`);
        }
        if (Array.isArray(embed.fields) && embed.fields.length > 0 && embed.fields[0].value) {
          lines.push(`${date} ${channel} assistant(response): ${embed.fields[0].value}`);
        }
      }
    }
  }

  if (lines.length > 0) {
    const outputFile = path.join(outputDir, file.replace(/^messages_/, "embeddings_").replace(/\.json$/, ".txt"));

    // ★★★ 핵심 수정: 인코딩을 'utf8' (하이픈 없음)으로 명시하여 BOM 생성을 방지합니다. ★★★
    fs.writeFileSync(outputFile, lines.join("\n"), { encoding: "utf8" });

    console.log(`텍스트 추출 완료: ${path.basename(outputFile)} (${lines.length} 라인)`);
  } else {
    console.warn(`내용 없음: ${path.basename(file)} 에는 처리할 메시지가 없어 파일을 생성하지 않습니다.`);
  }
}

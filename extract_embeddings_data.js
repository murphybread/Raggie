// extract_embeddings_data.js
import fs from "fs";
import path from "path";

const logsDir = "./logs";
const outputDir = "./embeddings_data";

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const files = fs.readdirSync(logsDir).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const arr = JSON.parse(fs.readFileSync(path.join(logsDir, file), "utf-8"));
  let result = [];
  for (const msg of arr) {
    if (msg.isBot === false) {
      result.push({
        type: "user",
        author: msg.author,
        content: msg.content,
        channelName: msg.channelName,
        timestamp: msg.timestamp,
      });
    } else if (msg.isBot === true && Array.isArray(msg.embeds)) {
      for (const embed of msg.embeds) {
        if (
          embed.description &&
          Array.isArray(embed.fields) &&
          embed.fields.length > 0 &&
          embed.fields[0].value
        ) {
          result.push({
            type: "assistant",
            question: embed.description,
            answer: embed.fields[0].value,
            channelName: msg.channelName,
            timestamp: msg.timestamp,
          });
        }
      }
    }
  }
  const outputFile = path.join(outputDir, file.replace(/^messages_/, "embeddings_"));
  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf-8");
  console.log("임베딩 데이터 추출 완료:", outputFile);
}

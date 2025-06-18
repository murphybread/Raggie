import express from 'express';
import bodyParser from 'body-parser';
import "dotenv/config";
import fs from 'fs';
import { handleAsk } from './rag.js';


const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// 대화 로그 저장 엔드포인트
app.post('/log', (req, res) => {
  const message = req.body;
  if (!message || !message.content) {
    return res.status(400).json({ error: 'No message content' });
  }
  let logs = [];
  if (fs.existsSync('messages.json')) {
    logs = JSON.parse(fs.readFileSync('messages.json'));
  }
  logs.push({
    ...message,
    timestamp: new Date().toISOString()
  });
  fs.writeFileSync('messages.json', JSON.stringify(logs, null, 2));
  res.json({ status: 'ok' });
});

// RAG 질문 엔드포인트
app.post('/ask', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'No question provided' });
  }
  const answer = await handleAsk(question);
  res.json({ answer });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

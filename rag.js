import fs from 'fs';

export async function handleAsk(question) {
  // messages.json에서 메시지 불러오기
  let logs = [];
  if (fs.existsSync('messages.json')) {
    logs = JSON.parse(fs.readFileSync('messages.json'));
  }
  // 키워드 기반 간단 검색: 질문에 포함된 단어가 메시지에 있으면 매칭
  const keywords = question.split(/\s+/).filter(w => w.length > 1);
  const matched = logs.filter(m =>
    keywords.some(kw => m.content && m.content.includes(kw))
  );
  // 매칭된 메시지 최대 5개, 없으면 최근 5개
  const contextLogs = (matched.length > 0 ? matched : logs.slice(-5)).slice(-5);
  const context = contextLogs.map(m => `${m.author}: ${m.content}`).join('\n');
  return `질문: ${question}\n관련 대화:\n${context}\n(여기에 LLM 답변이 들어갈 예정)`;
}

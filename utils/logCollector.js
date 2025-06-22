import fs from "fs";
import path from "path";

// 채널 이름을 파일명에 안전하게 사용하도록 필터링하는 함수
function sanitizeChannelName(name) {
  return name ? name.replace(/[^a-zA-Z0-9_]/g, "_") : "unknown";
}

// KST 변환 함수 (중복 방지 위해 파일 상단에 위치)
function toKST(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(d.getTime() + 9 * 60 * 60 * 1000);
}

// 채널 정보 기반으로 로그 파일 경로를 생성하는 함수
export function getLogFileNameByChannel(channelId, channelName, date = new Date()) {
  // date가 '+09:00' 등 오프셋이 포함된 문자열이면 직접 파싱
  if (typeof date === 'string' && /([+-][0-9]{2}:[0-9]{2})$/.test(date)) {
    const match = date.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
    if (match) {
      const y = match[1];
      const m = match[2];
      const d = match[3];
      const safeName = sanitizeChannelName(channelName);
      const fileName = `logs/messages_${safeName}_${channelId}_${y}${m}${d}.json`;
      return fileName;
    }
  }
  // KST ISO 문자열에서 연,월,일 추출
  const kstISOString = toKST(date).toISOString().replace('Z', '+09:00');
  const match = kstISOString.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
  if (match) {
    const y = match[1];
    const m = match[2];
    const d = match[3];
    const safeName = sanitizeChannelName(channelName);
    const fileName = `logs/messages_${safeName}_${channelId}_${y}${m}${d}.json`;
    return fileName;
  }
  // fallback (기존 방식)
  const kstDate = toKST(date);
  const y = kstDate.getFullYear();
  const m = String(kstDate.getMonth() + 1).padStart(2, "0");
  const d = String(kstDate.getDate()).padStart(2, "0");
  const safeName = sanitizeChannelName(channelName);
  const fileName = `logs/messages_${safeName}_${channelId}_${y}${m}${d}.json`;
  return fileName;
}

// 특정 채널의 최신 메시지를 수집하는 핵심 함수
// 다른 파일에서 호출할 수 있도록 client 객체를 인자로 받도록 수정합니다.
export async function collectRecentMessagesForChannel(client, channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.log(`[${channelId}] 채널을 찾을 수 없거나 텍스트 채널이 아닙니다.`);
    return;
  }

  // 이미 저장된 로그 파일들 중 가장 최근 메시지 ID 찾기
  let lastSavedId = undefined;
  let lastSavedTimestamp = 0;
  const logDir = path.resolve("logs");
  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir).filter(f => f.includes(channelId));
    let latestMsg = null;
    for (const file of files) {
      const filePath = path.join(logDir, file);
      try {
        const arr = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        for (const msg of arr) {
          if (!latestMsg || new Date(msg.timestamp).getTime() > lastSavedTimestamp) {
            latestMsg = msg;
            lastSavedTimestamp = new Date(msg.timestamp).getTime();
            lastSavedId = msg.id;
          }
        }
      } catch {}
    }
  }

  // 메시지 fetch 루프 (after: lastSavedId 적용)
  const fetched = [];
  let lastFetchedId = lastSavedId;
  while (true) {
    const options = { limit: 100 };
    if (lastFetchedId) options.after = lastFetchedId;
    const batch = await channel.messages.fetch(options).catch(() => null);
    if (!batch || batch.size === 0) break;
    const sorted = Array.from(batch.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    fetched.push(...sorted);
    lastFetchedId = sorted[sorted.length - 1].id;
    if (batch.size < 100) break;
  }

  if (fetched.length === 0) {
    console.log(`[${channelId}] 새 메시지 없음 (주기적 수집)`);
    return;
  }

  // 메시지별로 KST 날짜 기준 파일에 저장
  const logsByFile = {};
  fetched.forEach((msg) => {
    const logFileForMsg = getLogFileNameByChannel(msg.channel.id, msg.channel.name, msg.createdAt);
    if (!logsByFile[logFileForMsg]) {
      // 파일이 이미 존재하면 읽고, 없으면 빈 배열
      if (fs.existsSync(logFileForMsg)) {
        logsByFile[logFileForMsg] = JSON.parse(fs.readFileSync(logFileForMsg, "utf-8"));
      } else {
        logsByFile[logFileForMsg] = [];
      }
    }
    const logsArr = logsByFile[logFileForMsg];
    if (!logsArr.some((l) => l.id === msg.id)) {
      const embedData = msg.embeds.map((embed) => ({
        author: embed.author?.name || null,
        title: embed.title || null,
        description: embed.description || null,
        fields: embed.fields.map((field) => ({ name: field.name, value: field.value })),
        footer: embed.footer?.text || null,
      }));
      logsArr.push({
        id: msg.id,
        author: msg.author.username,
        authorId: msg.author.id,
        content: msg.content,
        embeds: embedData,
        channel: msg.channel.id,
        channelName: msg.channel.name,
        timestamp: toKST(msg.createdAt).toISOString().replace('Z', '+09:00'),
        attachments: msg.attachments.map((a) => a.url),
        mentions: msg.mentions.users.map((u) => u.id),
        isBot: msg.author.bot,
        referencedMessageId: msg.reference?.messageId || null,
      });
    }
  });

  // 파일별로 저장
  Object.entries(logsByFile).forEach(([file, logsArr]) => {
    // 30일 이내 메시지만 남기기
    const now = Date.now();
    const filtered = logsArr.filter((msg) => now - new Date(msg.timestamp).getTime() < 30 * 24 * 60 * 60 * 1000);
    fs.writeFileSync(file, JSON.stringify(filtered, null, 2));
  });
  console.log(`[${channelId}] [주기적 수집] 새 메시지 ${fetched.length}개 저장 완료.`);
}

import fs from "fs";
import path from "path";

// 채널 이름을 파일명에 안전하게 사용하도록 필터링하는 함수
function sanitizeChannelName(name) {
  return name ? name.replace(/[^a-zA-Z0-9_]/g, "_") : "unknown";
}

// 채널 정보 기반으로 로그 파일 경로를 생성하는 함수
export function getLogFileNameByChannel(channelId, channelName, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const safeName = sanitizeChannelName(channelName);
  return `logs/messages_${safeName}_${channelId}_${y}${m}${d}.json`;
}

// 특정 채널의 최신 메시지를 수집하는 핵심 함수
// 다른 파일에서 호출할 수 있도록 client 객체를 인자로 받도록 수정합니다.
export async function collectRecentMessagesForChannel(client, channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.log(`[${channelId}] 채널을 찾을 수 없거나 텍스트 채널이 아닙니다.`);
    return;
  }

  const logFile = getLogFileNameByChannel(channelId, channel.name);
  const logDir = path.dirname(logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
  }

  const lastMsgId = logs.length > 0 ? logs[logs.length - 1].id : undefined;

  const fetched = [];
  let lastFetchedId = lastMsgId;
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

  fetched.forEach((msg) => {
    const embedData = msg.embeds.map((embed) => ({
      author: embed.author?.name || null,
      title: embed.title || null,
      description: embed.description || null,
      fields: embed.fields.map((field) => ({ name: field.name, value: field.value })),
      footer: embed.footer?.text || null,
    }));
    logs.push({
      id: msg.id,
      author: msg.author.username,
      authorId: msg.author.id,
      content: msg.content,
      embeds: embedData,
      channel: msg.channel.id,
      channelName: msg.channel.name,
      timestamp: msg.createdAt.toISOString(),
      attachments: msg.attachments.map((a) => a.url),
      mentions: msg.mentions.users.map((u) => u.id),
      isBot: msg.author.bot,
      referencedMessageId: msg.reference?.messageId || null,
    });
  });

  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  console.log(`[${channelId}] [주기적 수집] 새 메시지 ${fetched.length}개 저장 완료.`);
}

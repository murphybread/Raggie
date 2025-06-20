import { OpenAI } from "openai";
import { EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { getLogFileNameByChannel, collectRecentMessagesForChannel } from "../utils/logCollector.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default {
  data: {
    name: "질문",
    description: "채널의 최근 대화를 기반으로 질문에 답변합니다.",
    options: [
      {
        name: "내용",
        type: 3,
        description: "질문할 내용",
        required: true,
      },
    ],
  },
  async execute(interaction) {
    // 1. 다른 어떤 작업보다 먼저 deferReply()를 호출하여 3초 타임아웃을 피합니다.
    
    await interaction.deferReply();
    
    

    
    
    const question = interaction.options.getString("내용");

    // 3. 실시간 로그 수집
    console.log(`[${interaction.channel.id}] /질문 명령어 사용으로 실시간 로그 수집 실행...`);
    await collectRecentMessagesForChannel(interaction.client, interaction.channel.id);

    // 4. 로그 파일 읽기
    const logFile = getLogFileNameByChannel(interaction.channel.id, interaction.channel.name);
    let recentLogs = [];
    if (fs.existsSync(logFile)) {
      const allLogs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
      recentLogs = allLogs.slice(-15);
    }

    // 5. 컨텍스트 생성
    let contextText = "채널에 대화 기록이 없습니다.";
    if (recentLogs.length > 0) {
      contextText = recentLogs
        .map((msg) => {
          const author = msg.isBot ? `AI(${msg.author})` : `사용자(${msg.author})`;
          if (msg.isBot && msg.embeds && msg.embeds.length > 0) {
            const embed = msg.embeds[0];
            const originalQuestion = embed.description || "";
            const botAnswer = embed.fields?.[0]?.value || "";
            return `${author}: (질문: "${originalQuestion}"에 대해) "${botAnswer}" 라고 답변함.`;
          }
          return `${author}: "${msg.content}"`;
        })
        .join("\n");
    }
    console.log(`[${interaction.channel.id}] 최근 대화 내용: ${contextText}`);

    // 6. 프롬프트 구성
    const prompt = `당신은 디스코드 채널에서 활동하는 AI 어시스턴트 'Raggie'입니다. 아래에 제공되는 '최근 대화 내용'을 참고하여 사용자의 '새로운 질문'에 대해 자연스럽게 답변해주세요.\n\n[최근 대화 내용]\n${contextText}\n\n[새로운 질문]\n${question}`;

    // 7. API 호출
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const answer = completion.choices[0]?.message?.content || "답변을 생성하지 못했습니다.";

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setAuthor({ name: `${interaction.user.username}님의 질문`, iconURL: interaction.user.displayAvatarURL() })
      .setTitle("질문 내용")
      .setDescription(question)
      .addFields({ name: "AI 답변", value: answer })
      .setTimestamp();

    // 8. 최종적으로 한 번만 응답을 수정합니다.
    await interaction.editReply({ embeds: [embed] });
  },
};

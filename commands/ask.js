import { OpenAI } from 'openai';
import { EmbedBuilder } from "discord.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default {
  data: {
    name: '질문',
    description: 'OpenAI LLM에게 질문하기',
    options: [
      {
        name: '내용',
        type: 3, // STRING
        description: '질문할 내용',
        required: true
      }
    ]
  },
  async execute(interaction) {
    const question = interaction.options.getString('내용');
    await interaction.deferReply();
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: question },
        ],
      });
      const answer = completion.choices[0]?.message?.content || '답변을 생성하지 못했습니다.';

      const embed = new EmbedBuilder()
        .setColor(0x0099ff) // 임베드 색상 설정
        .setAuthor({ name: `${interaction.user.username}님의 질문`, iconURL: interaction.user.displayAvatarURL() })
        .setTitle("질문 내용")
        .setDescription(question) // 사용자의 질문을 임베드에 포함
        .addFields({ name: "AI 답변", value: answer }) // AI의 답변 추가
        .setTimestamp()
        
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
        console.error("OpenAI API Error:", e);
        await interaction.editReply('OpenAI API 호출 중 오류가 발생했습니다.');
    }
  }
};

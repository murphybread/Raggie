import { OpenAI } from 'openai';

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
      await interaction.editReply(answer);
    } catch (e) {
      await interaction.editReply('OpenAI API 호출 중 오류가 발생했습니다.');
    }
  }
};

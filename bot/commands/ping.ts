import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong! and checks bot status');

export async function execute(interaction: ChatInputCommandInteraction) {
  const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(`🏓 Pong! Roundtrip latency is **${latency}ms**.`);
}

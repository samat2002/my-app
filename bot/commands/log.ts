import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { saveLogRecord } from '../../lib/discord-db';

export const data = new SlashCommandBuilder()
  .setName('log')
  .setDescription('Send a custom log entry to your Supabase database')
  .addStringOption((option) =>
    option
      .setName('text')
      .setDescription('Message text to log')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const text = interaction.options.getString('text', true);

  try {
    await saveLogRecord({
      user: interaction.user.tag || interaction.user.username,
      userId: interaction.user.id,
      message: text,
      time: new Date(),
    });

    await interaction.reply({
      content: `✅ Log saved to Supabase: "${text}"`,
      ephemeral: true,
    });
  } catch (error: any) {
    console.error('❌ Failed to save log from slash command:', error);
    await interaction.reply({
      content: `❌ Failed to save log: ${error?.message || 'Server error'}`,
      ephemeral: true,
    });
  }
}

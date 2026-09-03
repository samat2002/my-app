import { ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, Collection, Message } from 'discord.js';
import { batchSaveImages, SaveImageData } from '../../lib/discord-db';

export const data = new SlashCommandBuilder()
  .setName('scanimages')
  .setDescription('Scan channel history, detach all image attachments, and save them to Supabase')
  .addIntegerOption((option) =>
    option
      .setName('limit')
      .setDescription('Maximum number of messages to scan (default: 100, max: 500)')
      .setMinValue(10)
      .setMaxValue(500)
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;
  if (!channel || !('messages' in channel)) {
    await interaction.editReply('❌ Cannot scan this channel.');
    return;
  }

  const maxMessages = interaction.options.getInteger('limit') || 100;
  const imageItems: SaveImageData[] = [];

  let lastId: string | undefined;
  let totalScannedMessages = 0;

  try {
    while (totalScannedMessages < maxMessages) {
      const fetchLimit = Math.min(100, maxMessages - totalScannedMessages);
      const fetched: Collection<string, Message> = await (channel as TextChannel).messages.fetch({
        limit: fetchLimit,
        before: lastId,
      });

      if (fetched.size === 0) break;

      totalScannedMessages += fetched.size;
      lastId = fetched.last()?.id;

      for (const msg of fetched.values()) {
        if (msg.attachments.size > 0) {
          for (const attachment of msg.attachments.values()) {
            const isImage =
              attachment.contentType?.startsWith('image') ||
              /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.name || '');

            if (isImage) {
              imageItems.push({
                user: msg.author.tag || msg.author.username,
                userId: msg.author.id,
                image: attachment.url,
                filename: attachment.name || 'image',
                contentType: attachment.contentType || undefined,
                channelId: msg.channelId,
                messageId: msg.id,
                time: msg.createdAt,
              });
            }
          }
        }
      }

      if (fetched.size < fetchLimit) break;
    }

    if (imageItems.length === 0) {
      await interaction.editReply(`🔍 Scanned ${totalScannedMessages} messages. No image attachments found.`);
      return;
    }

    const result = await batchSaveImages(imageItems);

    await interaction.editReply(
      `✅ Scan complete!\n` +
      `• Messages scanned: **${totalScannedMessages}**\n` +
      `• Images found: **${imageItems.length}**\n` +
      `• Newly saved to Supabase: **${result.saved}**\n` +
      `• Already existed (skipped): **${result.skipped}**` +
      (result.errors > 0 ? `\n• Errors: **${result.errors}**` : '')
    );
  } catch (error: any) {
    console.error('❌ Error during /scanimages execution:', error);
    await interaction.editReply(`❌ Scan failed: ${error?.message || 'Unknown error'}`);
  }
}

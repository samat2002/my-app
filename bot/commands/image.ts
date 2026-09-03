import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { saveImageRecord } from '../../lib/discord-db';

export const data = new SlashCommandBuilder()
  .setName('image')
  .setDescription('Upload and save an image attachment to your Supabase database')
  .addAttachmentOption((option) =>
    option
      .setName('image')
      .setDescription('Upload an image file')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const attachment = interaction.options.getAttachment('image');

  if (!attachment) {
    await interaction.reply({ content: '❌ No image attachment provided.', ephemeral: true });
    return;
  }

  // Verify attachment is an image
  const isImage = attachment.contentType?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.name || '');
  if (!isImage) {
    await interaction.reply({
      content: '⚠️ The uploaded file is not recognized as a valid image.',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const result = await saveImageRecord({
      user: interaction.user.tag || interaction.user.username,
      userId: interaction.user.id,
      image: attachment.url,
      filename: attachment.name || 'image',
      channelId: interaction.channelId,
      time: new Date(),
    });

    if (result.created) {
      const permanentUrl = result.image.image;
      await interaction.editReply({
        content: `✅ Image **${attachment.name}** uploaded to Supabase Storage & saved to DB! [View Permanent Image](${permanentUrl})`,
      });
    } else {
      await interaction.editReply({
        content: `⚠️ Image **${attachment.name}** already exists in the database.`,
      });
    }
  } catch (error: any) {
    console.error('❌ Failed to save image from slash command:', error);
    await interaction.editReply({
      content: `❌ Error saving image to Supabase: ${error?.message || 'Internal error'}`,
    });
  }
}

import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Message,
  ChatInputCommandInteraction,
} from 'discord.js';
import { config, validateConfig } from './config';
import { saveImageRecord } from '../lib/discord-db';

import * as pingCommand from './commands/ping';
import * as imageCommand from './commands/image';
import * as scanImageCommand from './commands/scan-image';
import * as logCommand from './commands/log';

validateConfig();

interface CommandModule {
  data: { name: string };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// 1. Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 2. Register Slash Commands
const commands = new Collection<string, CommandModule>();
[pingCommand, imageCommand, scanImageCommand, logCommand].forEach((cmd) => {
  commands.set(cmd.data.name, cmd as unknown as CommandModule);
});

// 3. Client Ready Event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`🤖 Discord Bot is online! Logged in as: ${readyClient.user.tag}`);
  console.log(`🎯 Target Channel Filter: ${config.channelId || 'Listening to all accessible channels'}`);
});

// 4. Auto-detach & Save Images on Message Creation
client.on(Events.MessageCreate, async (message: Message) => {
  // Ignore bots to prevent infinite loops
  if (message.author.bot) return;

  // If a specific target channel is configured in .env, filter by it
  if (config.channelId && message.channel.id !== config.channelId) {
    return;
  }

  // Check if message contains attachments
  if (message.attachments.size === 0) return;

  for (const attachment of message.attachments.values()) {
    const isImage =
      attachment.contentType?.startsWith('image') ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment.name || '');

    if (isImage) {
      try {
        const result = await saveImageRecord({
          user: message.author.tag || message.author.username,
          userId: message.author.id,
          image: attachment.url,
          filename: attachment.name || 'image',
          contentType: attachment.contentType || undefined,
          channelId: message.channel.id,
          messageId: message.id,
          time: message.createdAt,
        });

        if (result.created) {
          console.log(`📸 Saved image from @${message.author.username} (${attachment.name}) to Supabase!`);
          // React to the message to confirm attachment was saved
          try {
            await message.react('📷');
          } catch {
            // Channel may not permit reactions, ignore
          }
        } else {
          console.log(`⚠️ Image already saved from message ID: ${message.id}`);
        }
      } catch (err: any) {
        console.error(`❌ Failed to save image from @${message.author.username}:`, err.message);
      }
    }
  }
});

// 5. Handle Slash Command Interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`❌ No command matching /${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error: any) {
    console.error(`❌ Error executing /${interaction.commandName}:`, error);
    const replyContent = {
      content: '❌ There was an error while executing this command!',
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(replyContent);
    } else {
      await interaction.reply(replyContent);
    }
  }
});

// 6. Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Gracefully shutting down Discord bot...');
  await client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Terminating Discord bot...');
  await client.destroy();
  process.exit(0);
});

// 7. Login
if (!config.botToken) {
  console.error('❌ Error: BOT_TOKEN is missing from .env');
  process.exit(1);
}

client.login(config.botToken);

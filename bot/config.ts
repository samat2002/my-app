import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  botToken: process.env.BOT_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  channelId: process.env.CHANNEL_ID || '',
  databaseUrl: process.env.DATABASE_URL || '',
};

export function validateConfig() {
  const missing: string[] = [];
  if (!config.botToken) missing.push('BOT_TOKEN');
  if (!config.clientId) missing.push('CLIENT_ID');

  if (missing.length > 0) {
    console.warn(`⚠️ Warning: Missing environment variables in .env: ${missing.join(', ')}`);
  }
}

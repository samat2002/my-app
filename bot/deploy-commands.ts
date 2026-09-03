import { REST, Routes } from 'discord.js';
import { config, validateConfig } from './config';
import * as pingCommand from './commands/ping';
import * as imageCommand from './commands/image';
import * as scanImageCommand from './commands/scan-image';
import * as logCommand from './commands/log';

validateConfig();

const commands = [
  pingCommand.data.toJSON(),
  imageCommand.data.toJSON(),
  scanImageCommand.data.toJSON(),
  logCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.botToken);

(async () => {
  try {
    console.log(`🚀 Refreshing ${commands.length} application (/) commands...`);

    let data: any;
    if (config.guildId) {
      // Guild-specific registration (immediate updates, recommended for dev)
      data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`✅ Successfully deployed ${data.length} commands to Guild (${config.guildId}).`);
    } else {
      // Global command registration (can take up to 1 hour to propagate)
      data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log(`✅ Successfully deployed ${data.length} global commands.`);
    }
  } catch (error) {
    console.error('❌ Error deploying Discord commands:', error);
  }
})();

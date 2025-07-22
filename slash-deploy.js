const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const BOT_ID = "1396948801775996999"
const SERVER_ID = "1049833264044580955"
const BOT_TOKEN = process.env.BOT_TOKEN

const rest = new REST().setToken(BOT_TOKEN)

rest.put(Routes.applicationGuildCommands(BOT_ID, SERVER_ID), { body: [] })
	.catch(console.log);

const slashRegister = async () => {
  try {
    await rest.put(Routes.applicationCommands(BOT_ID), {
      body: [
        new SlashCommandBuilder()
          .setName('ping')
          .setDescription('Sends pong'),
        new SlashCommandBuilder()
          .setName('getsharedglove')
          .setDescription('Gets info about a shared glove through putting its share code.')
          .addStringOption(option =>
            option.setName('code')
             .setDescription('The share code')
             .setRequired(true)
             .setMinLength(6)
             .setMaxLength(6)
          ),
      ],
    })
  } catch (error) {
    console.error(error)
  }
}

slashRegister()

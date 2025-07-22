const axios = require('axios');
const express = require('express');

const app = express()

app.listen(3000, () => {
  console.log('Project is running!')
})

app.get('/', (req, res) => {
  res.send('bot running')
})

require('./slash-deploy.js'); // Register slash commands

const Discord = require('discord.js');
const {ButtonStyle,
       ButtonBuilder, 
       ActionRowBuilder, 
       EmbedBuilder, 
       StringSelectMenuBuilder
} = require('discord.js')

const client = new Discord.Client({ intents: ["Guilds"] });

const componentToHex = (c) => {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

const rgbToHex = (r, g, b) => {
  return "#" + componentToHex(Math.round(r)) + componentToHex(Math.round(g)) + componentToHex(Math.round(b));
}

const getThumbnailForColor = (r, g, b) => {
  if (typeof r === "string" && typeof g === "string" && typeof b === "string") {
    if(!r && !g && !b) {
      return `https://dummyimage.com/540x380/fff/bg.png&text=+`
    }
  }

  let asHex = rgbToHex(r, g, b)

  return `https://dummyimage.com/540x380/${asHex.slice(1)}/bg.png&text=+`
}

async function usernameToId(username) {
  try {
    const result = await axios.post(`https://users.roblox.com/v1/usernames/users`, {
        usernames: [username],
        excludeBannedUsers: false
    }, {
      headers: { 'Content-Type': 'application/json' }
    })

    return result.data.data[0].id || -1
  } catch(err) {
    console.log(err)
  }
}

async function getHeadshotUrl(userId) {
  return `https://api.newstargeted.com/roblox/users/v1/avatar-headshot?userid=${userId}&size=150x150&format=Png&isCircular=false`
}

async function getHeadshotFromUsername(username) {
  const userId = await usernameToId(username);
  if (userId === -1) {
    return
  }

  const url = await getHeadshotUrl(userId);
  return url;
}

let status = {
  name: "👏 sb: glove maker",
  type: Discord.ActivityType.Playing,
  url: "https://www.roblox.com/games/10931788510/slap-battles-glove-maker"
}

client.on('ready', () => {
    console.log('Ready!');
    client.user.setActivity(status);
})

client.on('interactionCreate', async (interaction) => {
  if (interaction.isCommand()) {
    if (interaction.commandName == "ping") {
      await interaction.reply("Pong!")
    } else if (interaction.commandName == "getsharedglove") {
      const code = interaction.options.getString('code')
      const response = await axios.get(`https://apis.roblox.com/datastores/v1/universes/3942681704/standard-datastores/datastore/entries/entry`, {
        params: {
          'datastoreName': "GloveSharingDS",
          'entryKey': code,
        },
        headers: {
          'x-api-key': process.env.RBLX_OPEN_CLOUD_KEY
        }
      }).catch((err) => {
        if (err.response.data.message == "Entry not found in the datastore.") {
          return interaction.reply({ content: 'There is no glove with that share code!', ephemeral: true })
        }
        
        console.log(err.response)
        return interaction.reply({ content: 'There was an error!', ephemeral: true })
      })

      // if glove was returned

      if (interaction.replied) {
        return
      }

      let data = response.data

      if (!data.gloveInfo) {
        return interaction.reply({ content: 'The glove you requested is not supported.', ephemeral: true })
      }
      
      let creator = data.creator
      let gloveInfo = data.gloveInfo

      let thumbnailColor = gloveInfo.bgColor
      let thumbnailUrl
      thumbnailUrl = await axios.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${gloveInfo.bgTexture}&returnPolicy=PlaceHolder&size=420x420&format=png`).catch((err) => {})
      if (thumbnailUrl) {
        if (thumbnailUrl.data.data[0].imageUrl) {
          thumbnailUrl = thumbnailUrl.data.data[0].imageUrl
        } else {
          thumbnailUrl = getThumbnailForColor(thumbnailColor.R, thumbnailColor.G, thumbnailColor.B)
        }
      } else {
        thumbnailUrl = getThumbnailForColor(thumbnailColor.R, thumbnailColor.G, thumbnailColor.B)
      }

      let powerToShow = ""
      if (!gloveInfo.glovePowerInfo) {
        if (!gloveInfo.power) {
          powerToShow = "30"
        } else {
          powerToShow = gloveInfo.power
        }
      } else {
        powerToShow = gloveInfo.glovePowerInfo
      }

      let speedToShow = ""
      if (!gloveInfo.gloveSpeed.Info) {
        if (!gloveInfo.gloveSpeed.Actual) {
            speedToShow = "10"
        } else {
            speedToShow = gloveInfo.gloveSpeed.Actual
        }
      } else {
          speedToShow = gloveInfo.gloveSpeed.Info
      }

      let abilityActivateText = ""
      if (!gloveInfo.activationTypeText) {
        if (gloveInfo.isActive) {
          abilityActivateText = "Press E to Use"
        } else {
          abilityActivateText = "Passive"
        }
      } else {
          abilityActivateText = gloveInfo.activationTypeText
      }

      let pfp
      await getHeadshotFromUsername(creator).then((res) => 
        pfp = res
      )

      const embed = new EmbedBuilder()
        .setTitle(!gloveInfo.gloveName && "Default" || gloveInfo.gloveName)
        .setAuthor({name: `Glove with code: ${code}`})
        .setColor(rgbToHex(gloveInfo.gloveColor.R || 0, gloveInfo.gloveColor.G || 0, gloveInfo.gloveColor.B || 0))
        .setThumbnail(thumbnailUrl)
        .addFields(
          { name: 'Power', value: powerToShow},
          { name: 'Speed', value: speedToShow},
          { name: 'Ability', value: !gloveInfo.abilityName && "Fart blast" || gloveInfo.abilityName},
          { name: abilityActivateText, value: "", inline: true },
        )
        .setFooter({ text: `Glove by @${creator}`, iconURL: pfp });

      const button = new ButtonBuilder()
        .setLabel('Use glove in glove maker')
        .setURL(`https://www.roblox.com/games/start?placeId=10931788510&launchData=%7B%5C%22gloveCode%5C%22%3A%5C%22${code}%5C%22%7D`)
        .setStyle(ButtonStyle.Link);

      const select = new StringSelectMenuBuilder({
        custom_id: `info_select_preview-${code}`,
        placeholder: 'Select info to preview',
        min_values: 1,
        max_values: 1,
        options: [
            { label: 'Glove', value: 'glove', default: true },
            { label: 'Mastery', value: 'mastery' },
         ]
        })
      
      const buttonRow = new ActionRowBuilder()
        .addComponents(button);

      const selectRow = new ActionRowBuilder()
        .addComponents(select);
      
      await interaction.reply({
        embeds: [embed],
        components: [selectRow, buttonRow]
      })
    }
  }
})

client.on('interactionCreate', async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    const [prefix, code] = interaction.customId.split('-');

    if (prefix != 'info_select_preview') {
      return
    }

    const response = await axios.get(`https://apis.roblox.com/datastores/v1/universes/3942681704/standard-datastores/datastore/entries/entry`, {
        params: {
          'datastoreName': "GloveSharingDS",
          'entryKey': code,
        },
        headers: {
          'x-api-key': process.env.RBLX_OPEN_CLOUD_KEY
        }
      }).catch((err) => {
        if (err.response.data.message == "Entry not found in the datastore.") {
          return interaction.reply({ content: 'There was an error!', ephemeral: true })
        }
        
        console.log(err.response)
        return interaction.reply({ content: 'There was an error!', ephemeral: true })
      })

    let creator = data.creator
    let gloveInfo = data.gloveInfo

    if (interaction.replied) {
        return
      }

      let data = response.data

      if (!data.gloveInfo) {
        return interaction.reply({ content: 'The glove you requested is not supported.', ephemeral: true })
      }

    let mastery = gloveInfo.mastery

    let pfp
      await getHeadshotFromUsername(creator).then((res) => 
        pfp = res
      )

    let thumbnailUrl
      thumbnailUrl = await axios.get(`https://thumbnails.roblox.com/v1/assets?assetIds=${mastery.banner}&returnPolicy=PlaceHolder&size=420x420&format=png`).catch((err) => {})
      if (thumbnailUrl) {
        if (thumbnailUrl.data.data[0].imageUrl) {
          thumbnailUrl = thumbnailUrl.data.data[0].imageUrl
        } else {
          thumbnailUrl = getThumbnailForColor(48, 48, 48)
        }
      } else {
        thumbnailUrl = getThumbnailForColor(48, 48, 48)
      }

    const embed = new EmbedBuilder()
        .setTitle(`${!gloveInfo.gloveName && "Default" || gloveInfo.gloveName}'s mastery`)
        .setAuthor({name: `Glove with code: ${code}`})
        .setColor("#ffba68")
        .setThumbnail(thumbnailUrl)
        .setDescription(mastery.description)
        .addFields(
          { name: 'Upgrades', value: mastery.upgrades},
        )
        .setFooter({ text: `Glove by @${creator}`, iconURL: pfp });

    await interaction.update({
        embeds: [embed],
        components: interaction.message.components
    });
  }
});

client.login(process.env.BOT_TOKEN)

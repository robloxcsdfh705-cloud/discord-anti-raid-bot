require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const suspiciousLinkPattern = /(https?:\/\/|discord\.gg|discordapp\.com\/invite|bit\.ly|tinyurl)/i;
const recentJoins = new Map();

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', (member) => {
  const guildId = member.guild.id;
  const now = Date.now();
  const windowMs = 60 * 1000;

  const entries = recentJoins.get(guildId) || [];
  const filtered = entries.filter((time) => now - time < windowMs);
  filtered.push(now);
  recentJoins.set(guildId, filtered);

  if (filtered.length >= 6) {
    const logChannel = member.guild.channels.cache.find((ch) => ch.name === 'mod-logs');

    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Possible raid detected')
            .setDescription(`Too many members joined in a short time: ${filtered.length} in 1 minute.`)
            .setColor(0xfacc15)
            .addFields({ name: 'Guild', value: member.guild.name, inline: true })
        ]
      });
    }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const isSuspicious = suspiciousLinkPattern.test(message.content);
  if (isSuspicious) {
    await message.delete();
    await message.reply('Suspicious link detected. Please do not share untrusted links.');

    const logChannel = message.guild.channels.cache.find((ch) => ch.name === 'mod-logs');
    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Scam link blocked')
            .setDescription(`Message from ${message.author.tag} was removed.`)
            .setColor(0xf87171)
            .addFields({ name: 'Message', value: message.content.slice(0, 300), inline: false })
        ]
      });
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply({ content: 'Pong! Anti-raid bot is online.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);

require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const suspiciousLinkPattern = /(https?:\/\/|discord\.gg|discordapp\.com\/invite|bit\.ly|tinyurl|t\.me)/i;
const recentJoins = new Map();
const state = {
  welcomeMessage: '歡迎 {user} 加入伺服器！請先閱讀規則並完成驗證。',
  verificationRoleId: null,
  modLogChannelName: 'mod-logs',
  welcomeChannelName: 'welcome',
  aiKeywords: ['歡迎', '規則', '驗證', '幫助', '協助']
};

const adminIds = (process.env.ADMIN_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);

function isAdmin(member) {
  if (!member) return false;
  return member.permissions.has(PermissionsBitField.Flags.Administrator) || adminIds.includes(member.id);
}

async function sendModLog(guild, title, description, color = 0x5865F2) {
  const channel = guild.channels.cache.find((ch) => ch.name === state.modLogChannelName) || guild.channels.cache.first();
  if (!channel) return;

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
    ]
  });
}

async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('檢查機器人是否在線'),
    new SlashCommandBuilder().setName('驗證').setDescription('讓會員完成驗證').setDMPermission(false),
    new SlashCommandBuilder().setName('警告').setDescription('對使用者發送警告').addUserOption((opt) => opt.setName('user').setDescription('指定使用者').setRequired(true)).addStringOption((opt) => opt.setName('原因').setDescription('警告原因').setRequired(true)),
    new SlashCommandBuilder().setName('禁言').setDescription('禁言某位使用者').addUserOption((opt) => opt.setName('user').setDescription('指定使用者').setRequired(true)).addIntegerOption((opt) => opt.setName('分鐘').setDescription('禁言分鐘數').setRequired(true)),
    new SlashCommandBuilder().setName('解除禁言').setDescription('解除指定使用者禁言').addUserOption((opt) => opt.setName('user').setDescription('指定使用者').setRequired(true)),
    new SlashCommandBuilder().setName('踢出').setDescription('踢出成員').addUserOption((opt) => opt.setName('user').setDescription('指定使用者').setRequired(true)).addStringOption((opt) => opt.setName('原因').setDescription('踢出原因').setRequired(false)),
    new SlashCommandBuilder().setName('封鎖').setDescription('封鎖成員').addUserOption((opt) => opt.setName('user').setDescription('指定使用者').setRequired(true)).addStringOption((opt) => opt.setName('原因').setDescription('封鎖原因').setRequired(false)),
    new SlashCommandBuilder().setName('說').setDescription('在指定頻道發送訊息').addChannelOption((opt) => opt.setName('channel').setDescription('目標頻道').setRequired(true)).addStringOption((opt) => opt.setName('訊息').setDescription('訊息內容').setRequired(true)),
    new SlashCommandBuilder().setName('設置歡迎').setDescription('設定歡迎訊息').addStringOption((opt) => opt.setName('內容').setDescription('歡迎內容').setRequired(true))
  ].map((command) => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const guildId = process.env.GUILD_ID;

  if (!guildId) {
    console.warn('未設定 GUILD_ID，跳過 guild command 註冊');
    return;
  }

  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commands });
    console.log('Slash command 已註冊成功');
  } catch (error) {
    console.error('註冊 slash command 失敗:', error);
  }
}

client.once('ready', async () => {
  console.log(`已登入: ${client.user.tag}`);
  await registerSlashCommands();
});

client.on('guildMemberAdd', async (member) => {
  const guildId = member.guild.id;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const entries = recentJoins.get(guildId) || [];
  const filtered = entries.filter((time) => now - time < windowMs);
  filtered.push(now);
  recentJoins.set(guildId, filtered);

  const welcomeChannel = member.guild.channels.cache.find((ch) => ch.name === state.welcomeChannelName) || member.guild.systemChannel;
  const welcomeMessage = state.welcomeMessage.replace('{user}', `<@${member.id}>`);

  if (welcomeChannel) {
    await welcomeChannel.send(welcomeMessage);
  }

  try {
    await member.send(`歡迎加入 **${member.guild.name}**！請先閱讀規則並完成驗證，隨後管理員會給您權限。`);
  } catch (error) {
    console.log('無法發送 DM 到新成員');
  }

  if (filtered.length >= 6) {
    await sendModLog(member.guild, '⚠️ 疑似炸群事件', `最近 1 分鐘內加入了 ${filtered.length} 位成員，請立即檢查並啟動保護。`, 0xfacc15);

    if (process.env.RAID_AUTO_KICK === 'true') {
      await member.kick('觸發防炸群保護');
    }
  }
});

client.on('guildMemberRemove', async (member) => {
  await sendModLog(member.guild, '👋 成員離開', `${member.user.tag} 已離開伺服器。`, 0x60a5fa);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const text = message.content.trim();
  if (!text) return;

  const isSuspicious = suspiciousLinkPattern.test(text) || text.includes('@everyone') || text.includes('@here');

  if (isSuspicious) {
    await message.delete();
    await message.reply('⚠️ 可疑內容已被移除，請勿傳送外部連結或大量 @everyone/@here。');
    await sendModLog(message.guild, '🚫 可疑訊息封鎖', `已移除 ${message.author.tag} 的訊息：\n${text.slice(0, 300)}`, 0xf87171);
    return;
  }

  const lowerText = text.toLowerCase();
  const aiKeywords = state.aiKeywords.map((keyword) => keyword.toLowerCase());

  const matchedKeyword = aiKeywords.find((keyword) => lowerText.includes(keyword));
  if (matchedKeyword) {
    const responseMap = {
      歡迎: '歡迎加入我們的社群！如果你需要協助，請先閱讀規則並完成驗證。',
      規則: '請先閱讀伺服器規則，確保你了解所有要求與行為準則。',
      驗證: '請前往 #驗證 頻道完成驗證，完成後管理員會給你權限。',
      幫助: '如果你需要協助，請私訊管理員或在 #客服 訊息中提問。',
      協助: '如果你需要協助，請私訊管理員或在 #客服 訊息中提問。'
    };

    const response = responseMap[matchedKeyword] || '您好，請先閱讀規則並完成驗證。';
    await message.reply(response);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, member } = interaction;

  if (commandName === 'ping') {
    await interaction.reply({ content: '🏓 Pong! 防炸群機器人已在線。', ephemeral: true });
    return;
  }

  if (!isAdmin(member)) {
    await interaction.reply({ content: '⛔ 只有管理員才能使用此指令。', ephemeral: true });
    return;
  }

  if (commandName === '驗證') {
    await interaction.reply({ content: '✅ 驗證流程已啟動，請使用 #驗證 頻道完成驗證。', ephemeral: true });
    return;
  }

  if (commandName === '警告') {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('原因');
    await interaction.reply({ content: `⚠️ 已對 ${user.tag} 發送警告：${reason}`, ephemeral: true });
    await sendModLog(interaction.guild, '⚠️ 使用者警告', `${user.tag} 被警告：${reason}`, 0xf59e0b);
    return;
  }

  if (commandName === '禁言') {
    const user = interaction.options.getUser('user');
    const minutes = interaction.options.getInteger('分鐘');
    const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (targetMember) {
      await targetMember.timeout(minutes * 60 * 1000, '由管理員發出禁言');
    }

    await interaction.reply({ content: `🔇 已對 ${user.tag} 禁言 ${minutes} 分鐘。`, ephemeral: true });
    return;
  }

  if (commandName === '解除禁言') {
    const user = interaction.options.getUser('user');
    const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (targetMember) {
      await targetMember.timeout(null, '由管理員解除禁言');
    }

    await interaction.reply({ content: `✅ 已解除 ${user.tag} 的禁言。`, ephemeral: true });
    return;
  }

  if (commandName === '踢出') {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('原因') || '未提供原因';
    const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (targetMember) {
      await targetMember.kick(reason);
    }

    await interaction.reply({ content: `🚫 已踢出 ${user.tag}：${reason}`, ephemeral: true });
    return;
  }

  if (commandName === '封鎖') {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('原因') || '未提供原因';
    await interaction.guild.members.ban(user, { reason });
    await interaction.reply({ content: `⛔ 已封鎖 ${user.tag}：${reason}`, ephemeral: true });
    return;
  }

  if (commandName === '說') {
    const channel = interaction.options.getChannel('channel');
    const messageText = interaction.options.getString('訊息');
    await channel.send(messageText);
    await interaction.reply({ content: `✅ 已在 ${channel} 發送訊息。`, ephemeral: true });
    return;
  }

  if (commandName === '設置歡迎') {
    const content = interaction.options.getString('內容');
    state.welcomeMessage = content;
    await interaction.reply({ content: '✅ 歡迎訊息已更新。', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);

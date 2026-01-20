const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const WEBHOOK_URL = process.env.WEBHOOK_URL;

client.on('ready', () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guildId: member.guild.id,
        userId: member.id,
        username: member.user.username,
        avatarUrl: member.user.displayAvatarURL()
      })
    });
    console.log(`👋 Bienvenida enviada a ${member.user.username}`);
  } catch (error) {
    console.error('Error:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);

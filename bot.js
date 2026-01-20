const { Client, GatewayIntentBits } = require('discord.js');

// Lee las variables de entorno de Render
const BOT_TOKEN = process.env.BOT_TOKEN;
const FLOOT_WEBHOOK_URL = process.env.FLOOT_WEBHOOK_URL;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once('ready', () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
  console.log(`👋 Nuevo miembro: ${member.user.username} en ${member.guild.name}`);
  
  try {
    const payload = {
      json: {
        guildId: member.guild.id,
        userId: member.user.id,
        username: member.user.username,
        discriminator: member.user.discriminator || '0',
        avatarUrl: member.user.displayAvatarURL(),
      }
    };

    const response = await fetch(FLOOT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.text();
    console.log('📨 Respuesta de Floot:', data);
  } catch (error) {
    console.error('❌ Error enviando webhook:', error);
  }
});

client.login(BOT_TOKEN);

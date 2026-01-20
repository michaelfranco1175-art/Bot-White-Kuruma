const { Client, GatewayIntentBits } = require('discord.js');

// ⚠️ CONFIGURACIÓN - Pon tu token aquí
const BOT_TOKEN = 'MTQ2Mjk4OTA2NzkwNTE0Mjg3Nw.G3BGjn.vXwUNaPzibkdNXIgWCKY5MkWsk9XPf6s2X9wPo';

// URL del webhook de Floot
const FLOOT_WEBHOOK_URL = 'https://5a86614e-f2a4-47b6-b2e1-c747049dc33e.sandbox.floot.app/_api/webhook/discord';

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

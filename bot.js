// bot.js - Bot de Discord con bienvenidas y comandos /shift y /active
// Ejecuta: npm install discord.js && node bot.js

const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ]
});

// ⚠️ IMPORTANTE: Reemplaza con tu token real
const BOT_TOKEN = 'MTQ2Mjk4OTA2NzkwNTE0Mjg3Nw.GSSXWg.X0gl-hdljiMm8rwaJ3K0KrjxI2P3LVMJu8HtxA';
const CLIENT_ID = '1462989067905142877'; // ID de la aplicación del bot

// ID del canal donde enviar bienvenidas (opcional)
const WELCOME_CHANNEL_ID = '1458473769239707820';

// 🎭 ID del rol que se asigna durante el turno (opcional)
const SHIFT_ROLE_ID = '1463346510094794935'; // Pon aquí el ID del rol "En turno"

// Mensaje de bienvenida personalizado
const WELCOME_MESSAGE = `¡Bienvenido/a {user} a {server}! 🎉

Estamos felices de tenerte aquí.`;

// 📊 Almacenamiento de turnos activos (en memoria)
const activeShifts = new Map(); // { odUserId: { startTime, guildId } }

// 📈 Historial de turnos completados (para estadísticas)
const shiftHistory = new Map(); // { odUserId: [{ duration, endTime, guildId }] }

// ⏱️ Formatear duración
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// 📝 Registrar comandos slash
const commands = [
  new SlashCommandBuilder()
    .setName('shift')
    .setDescription('Gestiona tu turno de trabajo')
    .addSubcommand(sub =>
      sub.setName('start').setDescription('Iniciar tu turno')
    )
    .addSubcommand(sub =>
      sub.setName('end').setDescription('Terminar tu turno')
    )
    .addSubcommand(sub =>
      sub.setName('status').setDescription('Ver el tiempo de tu turno actual')
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard').setDescription('Ver ranking de horas trabajadas')
    ),
  new SlashCommandBuilder()
    .setName('active')
    .setDescription('Ver todos los usuarios en turno activo'),
].map(cmd => cmd.toJSON());

// Registrar comandos al iniciar
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  try {
    console.log('📝 Registrando comandos slash...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Comandos registrados correctamente');
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`📡 Escuchando en ${client.guilds.cache.size} servidor(es)`);
  registerCommands();
});

// 👋 Evento de bienvenida
client.on('guildMemberAdd', async (member) => {
  console.log(`👋 Nuevo miembro: ${member.user.tag}`);
  
  try {
    let channel;
    if (WELCOME_CHANNEL_ID) {
      channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    } else {
      channel = member.guild.systemChannel;
    }
    
    if (!channel) {
      console.log('⚠️ No se encontró canal para bienvenida');
      return;
    }
    
    const formattedMessage = WELCOME_MESSAGE
      .replace('{user}', `<@${member.id}>`)
      .replace('{server}', member.guild.name);
    
    await channel.send(formattedMessage);
    console.log(`✅ Bienvenida enviada a ${member.user.tag}`);
  } catch (error) {
    console.error('❌ Error al enviar bienvenida:', error);
  }
});

// ⚡ Manejar comandos slash
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName, user, guild } = interaction;
  
  // 🕐 Comando /shift
  if (commandName === 'shift') {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'start') {
      if (activeShifts.has(user.id)) {
        const shift = activeShifts.get(user.id);
        const duration = formatDuration(Date.now() - shift.startTime);
        
        const embed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('⚠️ Ya tienes un turno activo')
          .setDescription(`Iniciaste tu turno hace **${duration}**`)
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
      activeShifts.set(user.id, {
        startTime: Date.now(),
        guildId: guild.id,
        username: user.username
      });
      
      // 🎭 Asignar rol de turno
      let roleAssigned = false;
      if (SHIFT_ROLE_ID) {
        try {
          const member = await guild.members.fetch(user.id);
          await member.roles.add(SHIFT_ROLE_ID);
          roleAssigned = true;
          console.log(`🎭 Rol asignado a ${user.tag}`);
        } catch (error) {
          console.error('❌ Error asignando rol:', error);
        }
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Turno Iniciado')
        .setDescription(`<@${user.id}> ha comenzado su turno`)
        .addFields(
          { name: '🕐 Hora de inicio', value: new Date().toLocaleTimeString('es-ES'), inline: true },
          ...(roleAssigned ? [{ name: '🎭 Rol', value: 'Asignado ✓', inline: true }] : [])
        )
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }
    
    if (subcommand === 'end') {
      if (!activeShifts.has(user.id)) {
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Sin turno activo')
          .setDescription('No tienes ningún turno activo para terminar')
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
      const shift = activeShifts.get(user.id);
      const durationMs = Date.now() - shift.startTime;
      const duration = formatDuration(durationMs);
      activeShifts.delete(user.id);
      
      // Guardar en historial
      if (!shiftHistory.has(user.id)) {
        shiftHistory.set(user.id, []);
      }
      shiftHistory.get(user.id).push({
        duration: durationMs,
        endTime: Date.now(),
        guildId: guild.id,
        username: user.username
      });
      
      // 🎭 Quitar rol de turno
      let roleRemoved = false;
      if (SHIFT_ROLE_ID) {
        try {
          const member = await guild.members.fetch(user.id);
          await member.roles.remove(SHIFT_ROLE_ID);
          roleRemoved = true;
          console.log(`🎭 Rol removido de ${user.tag}`);
        } catch (error) {
          console.error('❌ Error removiendo rol:', error);
        }
      }
      
      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('🏁 Turno Finalizado')
        .setDescription(`<@${user.id}> ha terminado su turno`)
        .addFields(
          { name: '⏱️ Duración total', value: duration, inline: true },
          { name: '🕐 Hora de salida', value: new Date().toLocaleTimeString('es-ES'), inline: true },
          ...(roleRemoved ? [{ name: '🎭 Rol', value: 'Removido ✓', inline: true }] : [])
        )
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }
    
    if (subcommand === 'status') {
      if (!activeShifts.has(user.id)) {
        const embed = new EmbedBuilder()
          .setColor(0x808080)
          .setTitle('📋 Estado del Turno')
          .setDescription('No tienes ningún turno activo actualmente')
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
      const shift = activeShifts.get(user.id);
      const duration = formatDuration(Date.now() - shift.startTime);
      
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Tu Turno Actual')
        .addFields(
          { name: '⏱️ Tiempo activo', value: duration, inline: true },
          { name: '🕐 Inicio', value: new Date(shift.startTime).toLocaleTimeString('es-ES'), inline: true }
        )
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (subcommand === 'leaderboard') {
      // Obtener todos los usuarios con historial en este servidor
      const leaderboardData = [];
      
      for (const [odUserId, shifts] of shiftHistory.entries()) {
        const guildShifts = shifts.filter(s => s.guildId === guild.id);
        if (guildShifts.length === 0) continue;
        
        const totalMs = guildShifts.reduce((acc, s) => acc + s.duration, 0);
        const avgMs = totalMs / guildShifts.length;
        const username = guildShifts[guildShifts.length - 1].username;
        
        leaderboardData.push({
          odUserId,
          username,
          totalMs,
          avgMs,
          shiftCount: guildShifts.length
        });
      }
      
      // Ordenar por tiempo total (mayor a menor)
      leaderboardData.sort((a, b) => b.totalMs - a.totalMs);
      
      if (leaderboardData.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x808080)
          .setTitle('🏆 Leaderboard de Turnos')
          .setDescription('Aún no hay turnos completados registrados')
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
      }
      
      // Crear ranking (top 10)
      const medals = ['🥇', '🥈', '🥉'];
      const ranking = leaderboardData.slice(0, 10).map((data, index) => {
        const medal = medals[index] || `**${index + 1}.**`;
        return `${medal} <@${data.odUserId}> - ${formatDuration(data.totalMs)} (${data.shiftCount} turnos)`;
      }).join('\n');
      
      // Estadísticas globales
      const totalGlobalMs = leaderboardData.reduce((acc, d) => acc + d.totalMs, 0);
      const totalShifts = leaderboardData.reduce((acc, d) => acc + d.shiftCount, 0);
      const avgGlobalMs = totalShifts > 0 ? totalGlobalMs / totalShifts : 0;
      
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Leaderboard de Turnos')
        .setDescription(ranking)
        .addFields(
          { name: '📊 Total horas servidor', value: formatDuration(totalGlobalMs), inline: true },
          { name: '📈 Promedio por turno', value: formatDuration(avgGlobalMs), inline: true },
          { name: '🔢 Turnos completados', value: `${totalShifts}`, inline: true }
        )
        .setFooter({ text: 'Top 10 usuarios con más horas' })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }
  }
  
  // 👥 Comando /active
  if (commandName === 'active') {
    const guildShifts = [...activeShifts.entries()]
      .filter(([_, shift]) => shift.guildId === guild.id);
    
    if (guildShifts.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('👥 Usuarios Activos')
        .setDescription('No hay nadie en turno actualmente')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }
    
    const userList = guildShifts.map(([odUserId, shift]) => {
      const duration = formatDuration(Date.now() - shift.startTime);
      return `• <@${odUserId}> - **${duration}**`;
    }).join('\n');
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('👥 Usuarios en Turno')
      .setDescription(userList)
      .addFields({ name: '📊 Total activos', value: `${guildShifts.length} usuario(s)`, inline: true })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  }
});

// 🚀 Iniciar bot
client.login(BOT_TOKEN)
  .then(() => console.log('🚀 Iniciando conexión...'))
  .catch(err => console.error('❌ Error al conectar:', err));

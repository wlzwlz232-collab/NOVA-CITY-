const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: ['CHANNEL'] 
});

// ================= [ إعدادات سيرفر NOVA CITY الجاهزة ] =================

const TOKEN = 'MTUxMzc3OTk5ODAxODg5OTk3OA.G7jTCZ.sZveuPVFjcPjPkiezW2C3grloOS5nGOFwIUiv0'; // التوكين الخاص بك
const STAFF_CHANNEL_ID = '1512476866454356090'; // إيدي روم اللوق وقبول الهوية الخاص بك

// ======================================================================

let appCounter = 1; 
const activeUsers = new Set(); 

const QUESTIONS = [
    "اسمك :",
    "عمرك :",
    "اسم حسابك روبلوكس :",
    "الحلف ممنوع النسخ :-\n\nاقسم بالله ، اني لن اخرب بسيرفر نوفا ولا اسب ولا اقذف ولا اسرب رومات ولا افكار وما اخرب في رولات نوفا والله على ماأقول شهيد\n\n(اكتب: أقسم بالله أو موافق للمتابعة)"
];

client.on('ready', () => {
    console.log(`✨ NOVA CITY BOT IS ONLINE: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === 'setup-apply!') {
        if (!message.member.permissions.has('ManageGuild')) {
            return message.reply('❌ هذا الأمر مخصص لإدارة سيرفر NOVA CITY فقط.');
        }

        if (message.channel.id !== '1512358719680417935') {
            return message.reply('⚠️ يرجى كتابة هذا الأمر داخل روم قائمة التقديم المخصص له فقط!');
        }

        const embed = new EmbedBuilder()
            .setTitle('👑 نظام التقديم على الهوية - NOVA CITY')
            .setDescription('أهلاً بكم في سيرفر NOVA.\n\nاضغط على الزر الأخضر بالأسفل لبدء تعبئة طلب الهوية، وسيتواصل معك البوت في الخاص مباشرة.')
            .setColor('#2b2d31')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'NOVA CITY - نظام التحقق التلقائي', iconURL: client.user.displayAvatarURL() });

        const button = new ButtonBuilder()
            .setCustomId('start_apply')
            .setLabel('اضغط هنا لبدء التقديم')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {}); 
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'start_apply') {
        const user = interaction.user;

        if (activeUsers.has(user.id)) {
            return interaction.reply({ content: '⚠️ لديك تقديم قائم بالفعل في الخاص! يرجى إكماله أولاً.', ephemeral: true });
        }

        try {
            activeUsers.add(user.id);
            await interaction.reply({ content: '📥 تم إرسال الأسئلة إلى خاصك بنجاح! توجه إلى هناك لتعبئة طلب الهوية الخاص بك.', ephemeral: true });
            
            await user.send("👋 أهلاً بك في نظام تقديمات **NOVA CITY**!\nيرجى الإجابة على الأسئلة التالية متتابعة وبكل صدق:");

            const answers = [];

            for (let i = 0; i < QUESTIONS.length; i++) {
                const embed = new EmbedBuilder()
                    .setDescription(`**${i + 1}/${QUESTIONS.length} طلب هوية**\n\n${QUESTIONS[i]}`)
                    .setColor('#f1c40f');
                
                await user.send({ embeds: [embed] });

                const filter = m => m.author.id === user.id;
                const collected = await user.dmChannel.awaitMessages({ filter, max: 1, time: 180000, errors: ['time'] });
                answers.push(collected.first().content);
            }

            await user.send("تم التقديم انتظر القبول");
            activeUsers.delete(user.id);

            const staffChannel = client.channels.cache.get(STAFF_CHANNEL_ID);
            if (staffChannel) {
                const currentId = appCounter++;
                const resultEmbed = new EmbedBuilder()
                    .setTitle(`📝 طلب هوية جديد | #${currentId}`)
                    .setDescription(`**صاحب الطلب:** ${user} (${user.username})\n**الأيدي الخاص به:** \`${user.id}\``)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                    .setColor('#e67e22')
                    .setTimestamp();

                QUESTIONS.forEach((q, index) => {
                    const cleanQuestion = q.startsWith("الحلف") ? "قسم الحلف الالتزامي:" : q;
                    resultEmbed.addFields({ name: `🔹 ${cleanQuestion}`, value: `\`\`\`\n${answers[index]}\n\`\`\`` });
                });

                const acceptBtn = new ButtonBuilder()
                    .setCustomId(`accept_${user.id}_${currentId}`)
                    .setLabel('قبول الطلب ✅')
                    .setStyle(ButtonStyle.Success);

                const rejectBtn = new ButtonBuilder()
                    .setCustomId(`reject_${user.id}_${currentId}`)
                    .setLabel('رفض الطلب ❌')
                    .setStyle(ButtonStyle.Danger);

                const actionRow = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

                await staffChannel.send({ embeds: [resultEmbed], components: [actionRow] });
            }

        } catch (error) {
            activeUsers.delete(user.id);
            await user.send("❌ انتهى الوقت المتاح للإجابة (3 دقائق لكل سؤال) أو أن خاصك مغلق! تأكد من إعداداتك وأعد الضغط على الزر بالسيرفر.");
        }
    }

    if (interaction.customId.startsWith('accept_')) {
        const [, targetUserId, idNum] = interaction.customId.split('_');
        try {
            const targetUser = await client.users.fetch(targetUserId);
            await targetUser.send("**__تم قبولك في سيرفر NOVA CITY__**\n\n**_نرحب بكم في سيرفر NOVA __**");
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds)
                .setColor('#2ecc71')
                .setTitle(`✅ تم قبول الطلب #${idNum}`)
                .addFields({ name: '👮‍♂️ المسؤول المراجع:', value: `${interaction.user} (${interaction.user.username})` });
            await interaction.update({ embeds: [updatedEmbed], components: [] });
        } catch (err) {
            await interaction.update({ components: [] });
        }
    }

    if (interaction.customId.startsWith('reject_')) {
        const [, targetUserId, idNum] = interaction.customId.split('_');
        try {
            const targetUser = await client.users.fetch(targetUserId);
            await targetUser.send("**__تم نعتذر لعدم قبولك في سيرفر NOVA CITY__**\n\n**_نرجو منك عدم الاستهبال في التقديم  NOVA __**");
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds)
                .setColor('#e74c3c')
                .setTitle(`❌ تم رفض الطلب #${idNum}`)
                .addFields({ name: '👮‍♂️ المسؤول المراجع:', value: `${interaction.user} (${interaction.user.username})` });
            await interaction.update({ embeds: [updatedEmbed], components: [] });
        } catch (err) {
            await interaction.update({ components: [] });
        }
    }
});

client.login(TOKEN);

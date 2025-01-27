require('dotenv').config()
const { App } = require('@slack/bolt');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cm = require("./utils/cm")
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true
});
app.command('/adtstatus', async ({ ack, command, respond, say, body }) => {
    await ack();

    const armedRecord = await prisma.channel.findFirst({
        where: {
            id: command.channel_id
        }
    })
    const protections = await prisma.protection.findMany({
        where: {
            channelId: command.channel_id
        }
    })
    if (!armedRecord) return await respond(`:x: :shield: ADT is not armed in this channel. Users protected (${protections.length}): ${protections.map(user => `<@${user.userId}> (by <@${user.protectedBy}>)`).join(", ")}`);

    await respond(`:shield: ADT has been armed in this channel by <@${armedRecord.armedBy}>. Users protected (${protections.length}): ${protections.map(user => `<@${user.userId}> (by <@${user.protectedBy}>)`).join(", ")}\n${armedRecord.snitch ? "Snitch is on." : ""}`)

})
app.command('/disarm', async ({ ack, command, respond, say, body }) => {
    await ack();
    const isChannelManager = (await cm(command.channel_id)).includes(command.user_id)
    if (!isChannelManager) return await respond(":x: You'll need to be a channel manager to arm this channel.");

    const armedRecord = await prisma.channel.findFirst({
        where: {
            id: command.channel_id
        }
    })
    if (!armedRecord) return await respond(`:x: ADT has already been disarmed`)
    await prisma.channel.delete({
        where: {
            id: command.channel_id,
        }
    })
    await respond(`:x: :shield: ADT has been disarmed.`)

})
app.command('/protect', async ({ ack, command, respond, say, body }) => {
    await ack();
    const isChannelManager = (await cm(command.channel_id)).includes(command.user_id)
    if (!isChannelManager) return await respond(":x: You'll need to be a channel manager to protect someone");
    const channel = await app.client.conversations.info({
        channel: command.channel_id
    })
    if (!channel.channel.is_private) return await respond(":x: Only private channels can have protected users.");
    const authorization = await prisma.authorization.findFirst({
        where: {
            id: command.user_id
        }
    })
    if (!authorization) return await respond(":x: You'll need to authorize ADT. See: https://adt.david.hackclub.app/authorize");
    const protections = command.text.match(/\bU[A-Z0-9]{8,15}\b/gm)
    console.log(protections)
    if (!protections) return await respond(":x: No user ID(s) found. You can use multiple pings or mutiple IDs.");
    var status = []
    await Promise.all(protections.map(async id => {
        const existingProtection = await prisma.protection.findFirst({
            where: {
                userId: id,
                channelId: command.channel_id
            }
        })
        if (!existingProtection) {
            status.push(`- ✅ <@${id}> protected\n`)
            await prisma.protection.create({
                data: {
                    id: Math.random().toString(32).slice(2),
                    userId: id,
                    channelId: command.channel_id,
                    protectedBy: command.user_id
                }
            })
        } else {
            status.push(`- :x: <@${id}> unprotected\n`)
            await prisma.protection.delete({
                where: {
                    id: existingProtection.id
                }
            })
        }
    }))
    await respond(`✅ Updated the status of ${protections.length} user(s):\n${status.join("\n")}`);
})
app.command('/snitch', async ({ ack, command, respond, say, body }) => {
    await ack();
    const isChannelManager = (await cm(command.channel_id)).includes(command.user_id)
    if (!isChannelManager) return await respond(":x: You'll need to be a channel manager to arm this channel.");

    const channel = await app.client.conversations.info({
        channel: command.channel_id
    })
    if (!channel.channel.is_private) return await respond(":x: Only private channels can be snitched.")
    const authorization = await prisma.authorization.findFirst({
        where: {
            id: command.user_id
        }
    })
    if (!authorization) return await respond(":x: You'll need to authorize ADT. See: https://adt.david.hackclub.app/authorize");
    const armedRecord = await prisma.channel.findFirst({
        where: {
            id: command.channel_id
        }
    })
    if (armedRecord && !armedRecord.snitch) {
        await prisma.channel.update({
            where: {
                id: armedRecord.id
            },
            data: {
                id: armedRecord.id
            },
            data: {
                snitch: false
            }
        })
        await respond(":shield: :lying_face: Snitch has been deactivated.")
    } else {
        return await respond(":x: ADT has not been armed. Do that first.")
    }
});
app.command('/arm', async ({ ack, command, respond, say, body }) => {
    await ack();
    const isChannelManager = (await cm(command.channel_id)).includes(command.user_id)
    if (!isChannelManager) return await respond(":x: You'll need to be a channel manager to arm this channel.");

    const channel = await app.client.conversations.info({
        channel: command.channel_id
    })
    if (!channel.channel.is_private) return await respond(":x: Only private channels can be armed.")
    const authorization = await prisma.authorization.findFirst({
        where: {
            id: command.user_id
        }
    })
    if (!authorization) return await respond(":x: You'll need to authorize ADT. See: https://adt.david.hackclub.app/authorize");
    const armedRecord = await prisma.channel.findFirst({
        where: {
            id: command.channel_id
        }
    })
    if (armedRecord) return await respond(`:x: ADT has already been armed by <@${armedRecord.armedBy}>.`)
    await prisma.channel.create({
        data: {
            id: command.channel_id,
            armedBy: command.user_id
        }
    })
    await respond(":shield: ADT has been armed.")
});
app.event("member_left_channel", async ({ event, body }) => {
    const protectedRecord = await prisma.protection.findFirst({
        where: {
            channelId: event.channel,
            userId: event.user
        }
    })
    if (!protectedRecord) return;
    try {
        await app.client.conversations.invite({
            channel: event.channel,
            users: event.user
        })
        await app.client.chat.postEphemeral({
            user: event.user,
            channel: event.channel,
            text: `You currently have protection. As a result, you were added back to the channel.`
        })
    } catch (e) {

    }

})
app.event("member_joined_channel", async ({ event, body }) => {
    const armedRecord = await prisma.channel.findFirst({
        where: {
            id: event.channel
        }
    })
    if (!armedRecord) return;
    const protectedRecord = await prisma.protection.findFirst({
        where: {
            channelId: event.channel,
            userId: event.user
        }
    })
    if (protectedRecord) return;
    const authorization = await prisma.authorization.findFirst({
        where: {
            id: armedRecord.armedBy
        }
    })
    if (armedRecord.snitch) {
        await app.client.chat.postMessage({
            channel: event.channel,
            text: `:siren-real: <@${event.inviter}> attempted to add <@${event.user}> to the channel.`
        })
    }
    if (!authorization) return;
    try {
        await app.client.conversations.kick({
            token: authorization.accessToken,
            channel: event.channel,
            user: event.user
        })
        if (event.inviter)
            await app.client.chat.postEphemeral({
                user: event.inviter,
                channel: event.channel,
                text: `The channel is currently armed. As a result, <@${event.user}> was removed from the channel.`
            })
        await app.client.chat.postMessage({
            channel: event.user,
            text: `The channel is currently armed. As a result, you were removed from the channel.`
        })
    } catch (e) {
        console.error(e)
    }
});
(async () => {
    await app.start();
})();
require('dotenv').config()
const express = require('express')
const app = express()
const port = 3000
const { App } = require('@slack/bolt');
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});
app.get('/authorize', (req, res) => {
  res.redirect(`https://slack.com/oauth/v2/authorize?scope=groups:write&client_id=${process.env.SLACK_CLIENT_ID}&redirect_uri=https://adt.david.hackclub.app:3000/callback`)
})
app.get('/callback', async (req, res) => {
  const { code } = req.query;
  const host = `${req.protocol}://${req.get('host')}/callback`

  const response = await slackApp.client.oauth.v2.access({
    code,
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: host
  })
  const authRecord = await prisma.authorization.findFirst({
    where: {
      id: response.authed_user.id
    }
  })
  if (!authRecord) {
    await prisma.authorization.create({
      data: {
        id: response.authed_user.id,
        accessToken: response?.authed_user?.access_token || response.access_token
      }
    })
  } else {
    await prisma.authorization.update({
      where: {
        id: response.authed_user.id,
      },
      data: {
        accessToken: response?.authed_user?.access_token || response.access_token
      }
    })
  }
  res.send("Oauth2 flow successful. You can use ADT on channels you manage now.")
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

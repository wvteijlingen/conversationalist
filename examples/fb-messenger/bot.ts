import request from "request"
import { Bot, BotMessage, DelayedTypingEmitter } from "../../src"
import BranchingDialogue from "../branching/dialogue"

const PAGE_ACCESS_TOKEN = "EAAHxycuRcdYBAMtsC0EXPlGVRAcb1WNjwCOyguZBQUpwPZBSYn7zdAUlrHRk735p4kw9SGJyZCeaAq5Tv9nhZCceHEuvGZBeoJ2ZBJpwFr5HN1LhpXgsDWnkRhZCanneGr1MtRyimSlaZAmI8SvGWJbMfXVxH5ZAx1d6ZBeBEvZA1ffrQZDZD"

const botsByUserId: {
  [key: string]: Bot
} = {}

function createBot(userId: string) {
  const dialogue = new BranchingDialogue({ state: {} })
  const bot = new Bot(dialogue)
  bot.logger = console

  const emitter = new DelayedTypingEmitter(bot)

  emitter.events.update.on(({ isTyping, allMessages, addedMessage, prompt }) => {
    if(isTyping) {
      sendOutgoingAction("typing_on", userId)
    } else {
      sendOutgoingAction("typing_off", userId)
    }
    if(addedMessage && addedMessage.author === "bot") {
      sendOutgoingMessage(addedMessage, userId)
    }
  })

  bot.events.dialogueError.on(error => {
    bot.interjectMessages(["Whoops, it seems something went wrong!"])
  })

  return bot
}

function botForUserId(userId: string, forceCreate = false) {
  if(!botsByUserId[userId] || forceCreate) {
    botsByUserId[userId] = createBot(userId)
  }
  return botsByUserId[userId]
}

export function handleIncomingMessage(message: any, userId: string) {
  if(message.text === "start") {
    const bot = botForUserId(userId, true)
    bot.start()
  } else {
    const bot = botForUserId(userId, false)
    bot.sendUserMessage({
      body: message.text,
      value: message.quick_reply?.payload
    })
  }
}

function sendOutgoingMessage(message: BotMessage, userId: string) {
  const url = `https://graph.facebook.com/v4.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`

  let quickReplies
  if(message.prompt && (message.prompt.type === "picker")) {
    quickReplies = message.prompt?.choices.map(choice => ({
      content_type: "text",
      title: choice.body,
      payload: choice.value,
      // "image_url": "http://example.com/img/red.png"
    }))
  }

  const payload = {
    messaging_type: "RESPONSE",
    recipient: {
      id: userId
    },
    message: {
      text: message.body,
      quick_replies: quickReplies
    }
  }

  request.post(url, { json: payload }, function(error, response, body) {
    //
  })
}

function sendOutgoingAction(action: string, userId: string) {
  const url = `https://graph.facebook.com/v4.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`

  const payload = {
    recipient: {
      id: userId
    },
    sender_action: action
  }

  request.post(url, { json: payload }, function(error, response, body) {
    //
  })
}

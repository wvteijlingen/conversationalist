import fs from "fs"
import { prompt } from 'enquirer'
import { Message, Bot, Middleware } from './Bot'
import ScriptedDialogue from './ScriptedDialogue'
import OnboardingDialogue from './dialogues/OnboardingDialogue'
import HelpDialogue from './dialogues/HelpDialogue'

const bot = new Bot(new ScriptedDialogue("onboarding", OnboardingDialogue))

async function onMessagesAdded(messages: Message[]) {
  // Save state
  const snapshot = bot.snapshot
  fs.writeFileSync("./BotState.json", JSON.stringify(snapshot, null, 2))

  const message = messages[messages.length - 1]

  if(message.author === "user") {
    console.log(`< ${message.body}`)
    return
  }

  if (message.prompt === undefined) {
    console.log(`> ${message.body}`)

  } else if(message.prompt.type === "text") {
    const response = await prompt({
      type: 'input',
      name: 'input',
      message: `> ${message.body}`
    })

    bot.respond((<{input: string}>response).input)

  } else if(message.prompt.type === "inlinePicker" || message.prompt.type === "picker") {
    const response = await prompt({
      type: 'select',
      name: 'input',
      message: `> ${message.body}`,
      choices: message.prompt.choices.map(e => e.body)
    })

    const selectedChoice = message.prompt.choices.find(e => e.body === (<{input: string}>response).input) as {body: string, value: unknown}

    bot.respond(selectedChoice.body, selectedChoice.value)

  } else if(message.prompt.type === "slider") {
    const response = await prompt({
      type: 'numeral',
      name: 'input',
      message: `> ${message.body}`
    })

    bot.respond((<{input: string}>response).input)
  }
}

bot.on('messagesAdded', onMessagesAdded)

const HelpMiddleware: Middleware = (body, value, bot) => {
  if(body.toLowerCase() === "help") {
    bot.pushDialogue(new ScriptedDialogue("help", HelpDialogue))
    return false
  }
  return true
}

const CommandMiddleware: Middleware = (body, value, bot) => {
  if(!body.toLowerCase().startsWith("/")) {
    return true
  }

  bot.interjectMessages([`Running command: ${body}`])

  return false
}

bot.use(HelpMiddleware)
bot.use(CommandMiddleware)
bot.start()

import { prompt } from "enquirer"
import fs from "fs"
import { Bot, Message, Middleware } from "./Bot"
import HelpDialogue from "./dialogues/HelpDialogue"
import OnboardingDialogue from "./dialogues/OnboardingDialogue"

const chatBot = new Bot(OnboardingDialogue)
chatBot.debugMode = true

chatBot.dialogueFromIdentifier = identifier => {
  switch (identifier) {
    case "onboarding": return OnboardingDialogue
    case "help": return HelpDialogue
    default:
      throw new Error("unhandled")
  }
}

async function onMessagesAdded(messages: Message[]) {
  // Save state
  const snapshot = chatBot.snapshot
  fs.writeFileSync("./BotState.json", JSON.stringify(snapshot, null, 2))

  const message = messages[messages.length - 1]

  if(message.author === "user") {
    // tslint:disable-next-line: no-console
    console.log(`< ${message.body}`)
    return
  }

  if(message.prompt === undefined) {
    // tslint:disable-next-line: no-console
    console.log(`> ${message.body}`)

  } else if(message.prompt.type === "text") {
    const response = await prompt({
      type: "input",
      name: "input",
      message: `> ${message.body}`
    })

    chatBot.respond((response as { input: string }).input)

  } else if(message.prompt.type === "inlinePicker" || message.prompt.type === "picker") {
    const response = await prompt({
      type: "select",
      name: "input",
      message: `> ${message.body}`,
      choices: message.prompt.choices.map(e => e.body)
    })

    const selectedChoice = message.prompt.choices.find(e => e.body === (response as { input: string }).input) as { body: string, value: unknown }

    chatBot.respond(selectedChoice.body, selectedChoice.value)

  } else if(message.prompt.type === "slider") {
    const response = await prompt({
      type: "numeral",
      name: "input",
      message: `> ${message.body}`
    })

    chatBot.respond((response as { input: string }).input)
  }
}

const HelpMiddleware: Middleware = {
  before: (body, value, bot) => {
    if(body.toLowerCase() === "help") {
      bot.pushDialogueWithIdentifier("help")
      return false
    }
    return true
  }
}

const CommandMiddleware: Middleware = {
  before: (body, value, bot) => {
    if(body.toLowerCase().startsWith("/")) {
      bot.interjectMessages([`Running command: ${body}`])
      return false
    }
    return true
  }
}

chatBot.on("messagesAdded", onMessagesAdded)
chatBot.use(HelpMiddleware)
chatBot.use(CommandMiddleware)
chatBot.start()

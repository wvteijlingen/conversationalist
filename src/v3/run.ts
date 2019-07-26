import { prompt } from "enquirer"
import fs from "fs"
import { Bot, Message, Middleware } from "./conversationalist/Bot"
import Prompt from "./conversationalist/Prompts"
import HelpDialogue from "./dialogues/HelpDialogue"
import OnboardingDialogue from "./dialogues/OnboardingDialogue"

let chatBot: Bot
if(process.argv[2]) {
  const snapshot = JSON.parse(fs.readFileSync(process.argv[2]).toString())
  chatBot = Bot.fromSnapshot(snapshot, s => {
    switch(s.identifier) {
      case "onboarding": return new OnboardingDialogue(s)
      case "help": return new HelpDialogue(s)
      default:
        throw new Error(`Unknown dialogue identifier: ${s.identifier}`)
    }
  })
} else {
  chatBot = new Bot(new OnboardingDialogue())
}

chatBot.debugMode = true
chatBot.dialogueFromIdentifier = identifier => {
  switch (identifier) {
    case "onboarding": return new OnboardingDialogue()
    case "help": return new HelpDialogue()
    default:
      throw new Error(`Unknown dialogue identifier: ${identifier}`)
  }
}

async function showPrompt(p: Prompt, id: string, body: string) {
  if(p.type === "text") {
    const response = await prompt({
      type: "input",
      name: "input",
      message: `🤖   ${id}   ${body}`
    })

    chatBot.respond((response as { input: string }).input)

  } else if(p.type === "inlinePicker" || p.type === "picker") {
    const response = await prompt({
      type: "select",
      name: "input",
      message: `🤖   ${id}   ${body}`,
      choices: p.choices.map(e => e.body)
    })

    const selectedChoice = p.choices.find(e => e.body === (response as { input: string }).input) as { body: string, value: unknown }
    chatBot.respond(selectedChoice.body, selectedChoice.value)

  } else if(p.type === "slider") {
    const response = await prompt({
      type: "numeral",
      name: "input",
      message: `🤖   ${id}   ${body}`
    })

    chatBot.respond((response as { input: string }).input)
  }
}

async function onMessagesAdded(messages: Message[]) {
  // Save state
  const snapshot = chatBot.snapshot
  fs.writeFileSync("./BotState.json", JSON.stringify(snapshot, null, 2))

  const message = messages[messages.length - 1]

  if(message.author === "user") {
    // tslint:disable-next-line: no-console
    console.log(`  👱‍   ${message.id}   ${message.body}`)
    return
  }

  if(message.prompt === undefined) {
    // tslint:disable-next-line: no-console
    console.log(`  🤖   ${message.id}   ${message.body}`)

  } else {
    showPrompt(message.prompt, message.id, message.body)

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
    if(body.toLowerCase().startsWith("/undo")) {
      bot.interjectMessages([`Running command: ${body}`])
      const id = body.split(" ")[1]
      bot.undoResponse(id)
      if(chatBot.activePrompt) {
        showPrompt(chatBot.activePrompt, "", "")
      }
      return false
    }
    return true
  }
}

chatBot.on("messagesAdded", onMessagesAdded)
chatBot.use(HelpMiddleware)
chatBot.use(CommandMiddleware)

if(process.argv[2]) {
  if(chatBot.activePrompt) {
    showPrompt(chatBot.activePrompt, "", "")
  }
} else {
  chatBot.start()
}

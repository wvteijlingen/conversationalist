import { prompt } from "enquirer"
import fs from "fs"
import ora from "ora"
import Bot, { DialogueHydrator, Message, Middleware } from "../Bot"
import Prompt from "../Prompts"
import HelpDialogue from "./__mocks__/dialogues/HelpDialogue"
import OnboardingDialogue from "./__mocks__/dialogues/OnboardingDialogue"

function wait(delay: number) {
  return new Promise(function(resolve) {
    setTimeout(resolve, delay)
  })
}

const hydrator: DialogueHydrator = (identifier, snapshot) => {
  switch(identifier) {
    case "onboarding": return new OnboardingDialogue(snapshot)
    case "help": return new HelpDialogue(snapshot)
    default:
      throw new Error(`Unknown dialogue identifier: ${identifier}`)
  }
}

let chatBot: Bot
if(process.argv[2]) {
  const snapshot = JSON.parse(fs.readFileSync(process.argv[2]).toString())
  chatBot = Bot.fromSnapshot(snapshot, hydrator)
} else {
  chatBot = new Bot(new OnboardingDialogue(), hydrator)
}
// chatBot.debugMode = true

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

const loader: any = ora({
  text: "Typing…",
  spinner: {
    interval: 200,
    frames: [
      "  .   ",
      "  ..  ",
      "  ... ",
      "   .. ",
      "    . ",
      "      "
    ]
  }
})
async function onMessagesAdded(messages: Message[]) {
  for(const message of messages) {
    if(message.author === "user") {
      // tslint:disable-next-line: no-console
      console.log(`  👱‍   ${message.id}   ${message.body}`)
      return
    }

    loader.start()
    await wait(2000)
    loader.stop()

    if(message.prompt === undefined) {
      // tslint:disable-next-line: no-console
      console.log(`  🤖   ${message.id}   ${message.body}`)

    } else {
      showPrompt(message.prompt, message.id, message.body)
    }
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

chatBot.events.messagesAdded.on(onMessagesAdded)
chatBot.use(HelpMiddleware)
chatBot.use(CommandMiddleware)

chatBot.events.dialogueError.on(error => {
  chatBot.interjectMessages(["Whoops, something went wrong 😟", error.stack || error.message])
})

if(process.argv[2]) {
  if(chatBot.activePrompt) {
    showPrompt(chatBot.activePrompt, "", "")
  }
} else {
  chatBot.start()
}

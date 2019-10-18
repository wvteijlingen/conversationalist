import { prompt as enquirerPrompt } from "enquirer"
import ora from "ora"
import * as readline from "readline"
import { Bot, DelayedTypingEmitter, Dialogue, Message, Prompt } from "../src"

const loader = ora({
  text: "\x1b[33mTyping…\x1b[0m",
  color: "yellow",
  spinner: {
    interval: 200,
    frames: [
      ".  ",
      ".. ",
      "...",
      " ..",
      "  .",
      "   "
    ]
  }
})

function printMessage(message: Message) {
  if(message.author === "user") {
    // tslint:disable-next-line: no-console
    console.log("\x1b[36m%s\x1b[0m", message.body)
  } else {
    // tslint:disable-next-line: no-console
    console.log("\x1b[33m%s\x1b[0m", message.body)
  }
}

async function printPrompt(prompt: Prompt, bot: Bot) {
  if(prompt.type === "text") {
    const response = await enquirerPrompt({
      type: "input",
      name: "input",
      message: ""
    })

    clearPrompt()
    bot.sendUserMessage({
      body: (response as {
        input: string
      }).input
      })

  } else if(prompt.type === "picker") {
    const response = await enquirerPrompt({
      type: "select",
      name: "input",
      message: "",
      choices: prompt.choices.map(e => e.body)
    })

    clearPrompt()
    const selectedChoice = prompt.choices.find(e => e.body === (response as any).input) as any
    bot.sendUserMessage({ body: selectedChoice.body, value: selectedChoice.value })

  } else if(prompt.type === "slider") {
    const response = await enquirerPrompt({
      type: "numeral",
      name: "input",
      message: ""
    })

    clearPrompt()
    bot.sendUserMessage({
      body: (response as {
        input: string
      }).input
      })
  }
}

function clearPrompt() {
  readline.moveCursor(process.stdout, 0, -1)
  readline.clearLine(process.stdout, 0)
}

export default function runDialogueInTerminal(dialogue: Dialogue<unknown>) {
  // Keep the script running eternally
  (function wait() {
    setTimeout(wait, 1000)
  })()

  const bot = new Bot(dialogue)
  const emitter = new DelayedTypingEmitter(bot)

  bot.events.dialogueError.on(error => {
    throw error
  })

  emitter.events.update.on(({ isTyping, addedMessage }) => {
    if(isTyping) {
      loader.start()
    } else {
      loader.stop()
    }

    if(addedMessage) {
      if(addedMessage.author === "bot" && addedMessage.prompt) {
        printMessage(addedMessage)
        printPrompt(addedMessage.prompt, bot)
      } else {
        printMessage(addedMessage)
      }
    }
  })

  bot.start()
}

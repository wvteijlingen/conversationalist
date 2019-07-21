import fs from "fs"
import { prompt } from 'enquirer'
import { Message, Bot, Middleware } from './Bot'
import DialogueRunner from './DialogueRunner'
import OnboardingDialogue from './OnboardingDialogue'
import HelpDialogue from './HelpDialogue'

let dialogueRunner = new DialogueRunner(OnboardingDialogue)
dialogueRunner.identifier = "Onboarding"
let bot = new Bot(dialogueRunner)

async function onStep(message: Message) {
  // Save state
  const snapshot = bot.snapshot
  fs.writeFileSync("./BotState.json", JSON.stringify(snapshot, null, 2))


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

    bot.onReceiveResponse((<{input: string}>response).input)

  } else if(message.prompt.type === "prefab" || message.prompt.type === "picker") {
    const response = await prompt({
      type: 'select',
      name: 'input',
      message: `> ${message.body}`,
      choices: message.prompt.choices.map(e => e.value)
    })

    bot.onReceiveResponse((<{input: string}>response).input)

  } else if(message.prompt.type === "slider") {
    const response = await prompt({
      type: 'numeral',
      name: 'input',
      message: `> ${message.body}`
    })

    bot.onReceiveResponse((<{input: string}>response).input)
  }
}

bot.on('step', onStep)


const HelpMiddleware: Middleware = {
  run(response) {
    if(response.toLowerCase() === "help") {
      let dialogueRunner = new DialogueRunner(HelpDialogue)
      dialogueRunner.identifier = "Help"
      bot.pushDialogueRunner(dialogueRunner)
      return false
    }
    return true
  }
}

bot.middleware.push(HelpMiddleware)
bot.start()

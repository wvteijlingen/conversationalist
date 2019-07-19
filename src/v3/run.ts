import { prompt } from 'enquirer';
import { Message, Bot } from './Bot'
import OnboardingDialogue from './OnboardingDialogue'
import DialogueRunner from './DialogueRunner';

let dialogueRunner = new DialogueRunner(OnboardingDialogue)
let bot = new Bot(dialogueRunner)

async function onStep(message: Message) {
  if (message.prompt === undefined) {
    console.log(message.body)

  } else if(message.prompt.type === "text") {
    const response = await prompt({
      type: 'input',
      name: 'input',
      message: message.body
    });

    bot.onReceiveResponse((<{input: string}>response).input)

  } else if(message.prompt.type === "prefab" || message.prompt.type === "picker") {
    const response = await prompt({
      type: 'select',
      name: 'input',
      message: message.body,
      choices: message.prompt.choices.map(e => e.body)
    });

    bot.onReceiveResponse((<{input: string}>response).input)

  } else if(message.prompt.type === "slider") {
    const response = await prompt({
      type: 'numeral',
      name: 'input',
      message: message.body
    });

    bot.onReceiveResponse((<{input: string}>response).input)
  }
}

bot.on('step', onStep)

bot.start()

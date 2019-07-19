import { prompt } from 'enquirer';
import OnboardingConversation, { BotMessage } from "./ImperativeConversation";

let conversation = new OnboardingConversation()

async function onBotMessageAdded(message: BotMessage) {
  if (message.responseType === undefined) {
    console.log(message.body)

  } else if(message.responseType === "text") {
    const response = await prompt({
      type: 'input',
      name: 'input',
      message: message.body
    });

    conversation.answer((<{input: string}>response).input)

  } else if(message.responseType === "prefab" && message.prefabAnswers) {
    const response = await prompt({
      type: 'select',
      name: 'input',
      message: message.body,
      choices: message.prefabAnswers.map(e => e.body)
    });

    conversation.answer((<{input: string}>response).input)

  } else if(message.responseType === "slider") {
    const response = await prompt({
      type: 'numeral',
      name: 'input',
      message: message.body
    });

    conversation.answer((<{input: string}>response).input)
  }
}

conversation.on('messageAdded', onBotMessageAdded);

conversation.start()

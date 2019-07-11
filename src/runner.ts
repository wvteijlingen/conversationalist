import { prompt } from 'enquirer';
import OnboardingConversation from "./OnboardingConversation";

let conversation = new OnboardingConversation()

conversation.onMessageReceived = (message) => {
  console.log(">", message.body)
}

conversation.start()

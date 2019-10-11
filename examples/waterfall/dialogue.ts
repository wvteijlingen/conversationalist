import { WaterfallDialogue } from "../../src"

interface State {
  username: string
}

export default class ExampleWaterfallDialogue extends WaterfallDialogue<State> {
  identifier = "exampleDialogue"

  steps = [
    (s: State) => ({
      body: [`Hi ${s.username}!`, "Welcome to this simple waterfall dialogue."],
      buttons: ["Hello", "Hi"]
    }),
    (s: State) => ({
      body: "Do you prefer blue or yellow?",
      buttons: ["Blue", "Yellow"]
    }),
    (s: State) => ({
      body: ["Thank you for your answer.", "Goodbye!"],
      buttons: "Bye 👋"
    })
  ]
}

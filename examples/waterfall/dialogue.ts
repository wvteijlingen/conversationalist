import WaterfallDialogue from "../../src/dialogues/WaterfallDialogue"

interface State {
  username: string
}

export default class ExampleWaterfallDialogue extends WaterfallDialogue<State> {
  name = "exampleDialogue"

  steps = [
    (s: State) => ({
      messages: [`Hi ${s.username}!`, "Welcome to this simple waterfall dialogue."],
      buttons: ["Hello", "Hi"]
    }),
    (s: State) => ({
      messages: "Do you prefer blue or yellow?",
      buttons: ["Blue", "Yellow"]
    }),
    (s: State) => ({
      messages: ["Thank you for your answer.", "Goodbye!"],
      buttons: "Bye 👋"
    })
  ]
}

import runDialogueInTerminal from "../runner"
import ExampleWaterfallDialogue from "./dialogue"

const dialogue = new ExampleWaterfallDialogue({
  state: { username: "Bob" }
})

runDialogueInTerminal(dialogue)

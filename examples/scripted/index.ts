import runDialogueInTerminal from "../runner"
import ExampleScriptedDialogue from "./dialogue"

const dialogue = new ExampleScriptedDialogue({
  state: {}
})

runDialogueInTerminal(dialogue)

import BranchingDialogue from "./dialogue"
import runDialogueInTerminal from "../runner"

const dialogue = new BranchingDialogue({
  state: {}
})

runDialogueInTerminal(dialogue)

import Dialogue, { DialogueSnapshot, StepFunction, StepResult } from "../src/v3/Dialogue"
import { Script } from "../src/v3/ScriptedDialogue"

abstract class CombinedScriptedDialogue<State> implements Dialogue<State> {
  identifier!: string
  onStep?: (result: StepResult<State>, isFinished: boolean) => void
  onFinish?: (result: State) => void

  private state: State
  private nextStep?: StepFunction<State>

  script!: Script<State>

  // Creates a new dialog runner
  // @param dialogue The dialogue to run
  // @param initialSate The intial state to start the dialogue with
  // @param snapshot Optional dialogue snapshot for resuming the dialogue
  constructor(initialState?: State, snapshot?: DialogueSnapshot<State>) {
    this.state = initialState || { } as State

    if(snapshot && snapshot.nextStepName) {
      this.nextStep = this.script[snapshot.nextStepName] as StepFunction<State>
    }
  }

  onReceiveResponse(response?: unknown): boolean {
    if(this.nextStep) {
      this.runStep(this.nextStep, response, this.state)
      return true
    } else {
      return false
    }
  }

  start() {
    this.runStep(this.script.start, undefined, this.state)
  }

  jumpToStep(stepName: string) {
    this.nextStep = this.script[stepName] as StepFunction<State>
    // TODO: Clear the message log
  }

  private async runStep(step: StepFunction<State>, response: unknown | undefined, state: State) {
    const stepResult: StepResult<State> = await step.call(this, response, state)

    if(stepResult.nextStep) {
      this.nextStep = stepResult.nextStep
    } else {
      this.nextStep = undefined
    }

    if(this.onStep) {
      this.onStep(stepResult, this.nextStep === undefined)
    }

    // Go to the next step immediately if there is a next step and no prompt
    if(this.nextStep && !stepResult.prompt) {
      this.runStep(this.nextStep, undefined, this.state)
    }
  }

  get snapshot(): DialogueSnapshot<State> {
    return {
      identifier: this.identifier,
      state: this.state,
      nextStepName: this.nextStep && this.nextStep.name
    }
  }
}

interface HelpState {
  q?: string
}

class Help extends CombinedScriptedDialogue<HelpState> {
  identifier = "help"
  script: Script<HelpState> = {
    start(response: unknown | undefined, state: HelpState) {
      return {
        body: ["Do you need help with something?"],
        prompt: {
          type: "inlinePicker", choices: [
            { body: "Yes", value: "TRUE" },
            { body: "No", value: "FALSE" }
          ]
        },
        nextStep: this.handle
      }
    },

    handle(response: unknown | undefined, state: HelpState) {
      if(response === "TRUE") {
        return {
          body: ["No worries, I can help you!", "What is the problem?"],
          prompt: { type: "text" },
          nextStep: this.handleHelp
        }
      } else {
        return {
          body: "Ok, let's get back to where we left off then. As I was saying..."
        }
      }
    },

    handleHelp(response: unknown | undefined, state: HelpState) {
      return {
        body: ["I cannot help you with that 🙁", "let's get back to where we left off. As I was saying..."]
      }
    }
  }
}

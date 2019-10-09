import Dialogue, { DialogueSnapshot, StepResult } from "./Dialogue"

type Steps<State> = Array<(state: State) => { body: string | string[], buttons: string | string[] }>

export interface WaterfallDialogueSnapshot<State> extends DialogueSnapshot<State> {
  nextStepIndex?: number
}

/**
 * A dialogue that runs as a single branch. Each step returns a prompt with one or more buttons that advance the dialogue.
 * The dialogue has no internal state, no return value, and does not handle the user response except for advancing the dialogue.
 */
export default class WaterfallDialogue<State = {}> implements Dialogue<State> {
  readonly identifier: string
  readonly steps: Steps<State>

  onStepStart?: () => void
  onStep?: (result: StepResult, isFinished: boolean) => void
  onError?: (error: Error) => void

  protected state: State
  protected nextStepIndex?: number = 0
  protected nextDialogue?: Dialogue<unknown>

  constructor(identifier: string, steps: Steps<State>, initialState: State, nextDialogue?: Dialogue<unknown>, snapshot?: WaterfallDialogueSnapshot<State>) {
    this.identifier = identifier
    this.steps = steps
    this.state = initialState
    this.nextDialogue = nextDialogue

    if(snapshot) {
      this.state = snapshot.state
      this.nextStepIndex = snapshot.nextStepIndex
    }
  }

  get snapshot(): WaterfallDialogueSnapshot<State> | undefined {
    return {
      identifier: this.identifier,
      state: this.state,
      nextStepIndex: this.nextStepIndex
    }
  }

  onStart() {
    if(this.steps[0]) {
      this.runStepAtIndex(0)
    } else {
      this.onStep && this.onStep({
        nextDialogue: this.nextDialogue
      }, true)
    }
  }

  rewind(rewindData: any) {
    // Not rewindable
  }

  onReceiveResponse(response?: unknown) {
    if(this.nextStepIndex !== undefined) {
      this.runStepAtIndex(this.nextStepIndex)
    } else {
      this.onStep && this.onStep({
        nextDialogue: this.nextDialogue
      }, true)
    }
  }

  private runStepAtIndex(index: number) {
    try {
      this.onStepStart && this.onStepStart()

      const isLastStep = index === this.steps.length - 1
      const stepResult = this.steps[index](this.state)

      const choices = Array.isArray(stepResult.buttons) ? stepResult.buttons : [stepResult.buttons]
      const step: StepResult = {
        body: stepResult.body,
        prompt: {
          type: "inlinePicker",
          choices: choices.map(e => ({ body: e, value: e })),
          isUndoAble: false
        },
      }

      if(!isLastStep) {
        this.nextStepIndex = index + 1
      } else {
        this.nextStepIndex = undefined
      }

      this.onStep && this.onStep(step, false)
    } catch(error) {
      this.onError && this.onError(error)
    }
  }
}

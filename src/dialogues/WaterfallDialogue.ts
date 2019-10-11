import Dialogue, { DialogueEvents, DialogueInput, DialogueOutput, DialogueSnapshot } from "../Dialogue"

type Step<State> = (state: State) => Pick<DialogueOutput, "body"> & { buttons: string | string[] }

export interface Snapshot<State> extends DialogueSnapshot<State> {
  nextStepIndex?: number
}

/**
 * A dialogue that runs as a single branch. Each step returns a prompt with one or more buttons that advance the dialogue.
 * The dialogue has no internal state, no return value, and does not handle the user response except for advancing the dialogue.
 */
export default abstract class WaterfallDialogue<State = {}> implements Dialogue<State> {
  abstract readonly identifier: string
  readonly steps: Array<Step<State>> = []

  events: DialogueEvents = { }

  protected state: State
  protected nextStepIndex?: number = 0
  protected nextDialogue?: Dialogue<unknown>

  constructor(params: { state: State, snapshot?: never } | { state?: never, snapshot: Snapshot<State> }) {
    if(params.state) {
      this.state = params.state
    } else if(params.snapshot) {
      this.state = params.snapshot.state
      if(params.snapshot.nextStepIndex !== undefined) {
        if(!this.steps[params.snapshot.nextStepIndex]) {
          throw Error(`Snapshot contains step index ${params.snapshot.nextStepIndex}, but there is no step with that index.`)
        }
        this.nextStepIndex = params.snapshot.nextStepIndex
      }
    } else {
      throw new Error("Params must either include an initial state or a snapshot.")
    }
  }

  get snapshot(): Snapshot<State> | undefined {
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
      this.events.output?.({ nextDialogue: this.nextDialogue }, true)
    }
  }

  onReceiveInput(input?: DialogueInput) {
    if(this.nextStepIndex !== undefined) {
      this.runStepAtIndex(this.nextStepIndex)
    } else {
      this.events.output?.({
        nextDialogue: this.nextDialogue
      }, true)
    }
  }

  private runStepAtIndex(index: number) {
    try {
      this.events.outputStart?.()

      const isLastStep = index === this.steps.length - 1
      const stepResult = this.steps[index](this.state)

      const choices = Array.isArray(stepResult.buttons) ? stepResult.buttons : [stepResult.buttons]
      const step: DialogueOutput = {
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

      this.events.output?.(step, false)
    } catch(error) {
      this.events.error?.(error)
    }
  }

  // private getStepByIndexOrThrow(index: number): Step<State> {
  //   const entry = Object.entries(this.steps).find(e => e[0] === name)

  //   if(!entry) {
  //     throw new Error(`The step with index "${index}" does not exist in the steps.`)
  //   }

  //   return entry[1]
  // }
}

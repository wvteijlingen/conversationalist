import Dialogue, { DialogueEvents, DialogueInput, DialogueOutput } from "../Dialogue"

interface Intent {
  query: string
  topScoringIntent: {
    intent: string
    score: number
  }
  entities: [
    {
      entity: string
      type: string
      startIndex: number
      endIndex: number
      score: number
    }
  ]
}

export default abstract class NLPDialogue<State = {}> implements Dialogue<State> {
  abstract readonly name: string
  protected state: State
  events: DialogueEvents = {}

  constructor(params: { state: State, snapshot?: never }) {
    this.state = params.state
  }

  get snapshot() {
    return undefined
  }

  onStart() {
    //
  }

  onReceiveInput(input?: DialogueInput) {
    const intent: Intent = { query: input } as Intent
    this.handleIntent(intent).then(output => {
      this.events.output?.(output.output, output.isFinished)
    }, error => {
      this.events.error?.(error)
    })
  }

  protected abstract handleIntent(intent: Intent): Promise<{ output: DialogueOutput, isFinished: boolean }>
}

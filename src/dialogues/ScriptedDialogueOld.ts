// import Dialogue, { DialogueSnapshot, DialogueOutput, DialogueInput } from "./Dialogue"

// /**
//  * A script that can be executed by a ScriptedDialogue.
//  * Its `start` function will be called as soon as the dialogue becomes active.
//  */
// export interface Script<State = {}> {
//   start: ScriptStep<State>
//   // [key: string]: ScriptStep<State>
// }

// export type ScriptStepResult<State> = Promise<{
//   /**
//    * The step to be called when receiving the next user response.
//    * If this step result does not contain a prompt, the next step will be called immediately after the current step.
//    */
//   nextStep?: ScriptStep<State>
// } & Omit<DialogueOutput, "rewindData">>

// /**
//  * A step in a dialogue script. This will usually be called in response to receiving a user response.
//  * @param response The response that triggered this step.
//  * @param state The current dialogue state. This can be directly mutated.
//  */
// export type ScriptStep<State = {}> = (response: DialogueInput, state: State) => ScriptStepResult<State>

// interface ScriptedDialogueSnapshot<State> extends DialogueSnapshot<State> {
//   nextStepName?: string
// }

// /**
//  * A dialogue that runs by executing a script. Each step in the script is called when a user response is received.
//  */
// export default abstract class ScriptedDialogue<State = {}> implements Dialogue<State> {
//   abstract readonly identifier: string
//   protected enableSnapshots = true

//   onOutputStart?: () => void
//   onOutput?: (result: DialogueOutput, isFinished: boolean) => void
//   onError?: (error: Error) => void

//   protected state: State
//   protected nextStep?: ScriptStep<State>

//   readonly script: Script<State> = {
//     async start(response: DialogueInput, state: State): ScriptStepResult<State> {
//       return { }
//     }
//   }

//   constructor(params: { state: State, snapshot?: never } | { state?: never, snapshot: ScriptedDialogueSnapshot<State> }) {
//     if(params.state) {
//       this.state = params.state
//     }

//     if(params.snapshot) {
//       this.state = params.snapshot.state

//       if(params.snapshot.nextStepName) {
//         const nextStep = getScriptStepByName(this.script, params.snapshot.nextStepName)
//         if(!nextStep) {
//           throw new Error(`The provided snapshot refers to the script step ${params.snapshot.nextStepName}, but that step does not exist in the script returned from buildScript`)
//         }
//         this.nextStep = nextStep
//       }
//     }

//     throw new Error("Params must either include an intial state or a snapshot.")
//   }

//   get snapshot(): ScriptedDialogueSnapshot<State> | undefined {
//     if(this.enableSnapshots) {
//       return undefined
//     }

//     return {
//       identifier: this.identifier,
//       state: this.state,
//       nextStepName: this.nextStep && this.nextStep.name
//     }
//   }

//   onStart() {
//     this.runStep(this.script.start, undefined, this.state)
//   }

//   rewind(rewindData: any) {
//     if(typeof rewindData.nextStepName !== "string") {
//       throw new Error("The provided rewindData is invalid.")
//     }

//     const nextStep = getScriptStepByName(this.script, rewindData.nextStepName)
//     if(!nextStep) {
//       throw new Error(`The provided rewindData refers to the script step ${rewindData.nextStepName}, but that step does not exist in the script returned from buildScript`)
//     }

//     this.nextStep = nextStep
//   }

//   onReceiveInput(response?: unknown) {
//     if(this.nextStep) {
//       this.runStep(this.nextStep, response, this.state)
//     }
//   }

//   /**
//    * Runs the given script step, and passes the step result back to the Bot.
//    * @param step The script step to run.
//    * @param response The user response that triggered the next step.
//    * @param state The dialogue state to pass to the script step.
//    */
//   protected async runStep(step: ScriptStep<State>, response: unknown | undefined, state: State) {
//     this.onOutputStart && this.onOutputStart()

//     let internalStepResult
//     try {
//       internalStepResult = await step.call(this.script, response, state)
//     } catch(error) {
//       this.onError && this.onError(error)
//       return
//     }

//     const stepResult: DialogueOutput = { ...internalStepResult }

//     if(internalStepResult.nextStep) {
//       this.nextStep = internalStepResult.nextStep
//     } else {
//       this.nextStep = undefined
//     }

//     if(internalStepResult.prompt && internalStepResult.prompt.isUndoAble !== false && internalStepResult.nextStep) {
//       stepResult.rewindData = { nextStepName: internalStepResult.nextStep.name }
//     }

//     this.onOutput && this.onOutput(stepResult, this.nextStep === undefined)

//     // Go to the next step immediately if there is a next step and no prompt
//     if(this.nextStep && !internalStepResult.prompt) {
//       this.runStep(this.nextStep, undefined, this.state)
//     }
//   }
// }

// function getScriptStepByName<State>(script: Script<State>, name: string): ScriptStep<State> | undefined {
//   const entry = Object.entries(script).find(e => e[0] === name)
//   return entry ? entry[1] : undefined
// }

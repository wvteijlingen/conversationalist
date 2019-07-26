// import Dialogue, { DialogueSnapshot, StepResult, UserResponse } from "./Dialogue"

// interface ScriptStepResult extends StepResult {
//   nextStep?: StepFunction
// }
// export type StepFunction = (response: UserResponse) => ScriptStepResult

// abstract class CombinedScriptedDialogue<State> implements Dialogue<State> {
//   identifier: string
//   onStep?: (result: StepResult, isFinished: boolean) => void
//   onFinish?: (result: State) => void

//   protected steps!: { [key: string]: StepFunction }
//   protected state: State
//   private previousStep?: { function: StepFunction, response?: UserResponse }
//   private nextStep?: StepFunction

//   // @param dialogue The dialogue to run.
//   // @param initialState The intial state to start the dialogue with.
//   // @param snapshot Optional dialogue snapshot for resuming the dialogue.
//   constructor(identifier: string, initialState?: State, snapshot?: DialogueSnapshot<State>) {
//     this.identifier = identifier
//     this.state = initialState || { } as State
//     if(snapshot && snapshot.nextStepName) {
//       this.nextStep = this.steps[snapshot.nextStepName]
//     }
//   }

//   start() {
//     this.runStep(this.steps.start, undefined)
//   }

//   rewind(rewindData: any): void {
//     this.nextStep = this.steps[rewindData.nextStepName]
//   }

//   onReceiveResponse(response?: unknown): boolean {
//     if(this.nextStep) {
//       this.runStep(this.nextStep, response)
//       return true
//     } else {
//       return false
//     }
//   }

//   onInterrupt(): void {
//     //
//   }

//   onResume(): void {
//     //
//   }

//   private async runStep(step: StepFunction, response: unknown | undefined) {
//     const stepResult = await step(response)

//     if(stepResult.nextStep) {
//       this.nextStep = stepResult.nextStep
//     } else {
//       this.nextStep = undefined
//     }

//     if(stepResult.prompt && stepResult.nextStep) {
//       stepResult.rewindData = { nextStepName: stepResult.nextStep.name }
//     }

//     if(this.onStep) {
//       this.onStep(stepResult, this.nextStep === undefined)
//     }

//     // Go to the next step immediately if there is a next step and no prompt
//     if(this.nextStep && !stepResult.prompt) {
//       this.runStep(this.nextStep, undefined)
//     }
//   }

//   get snapshot(): DialogueSnapshot<State> {
//     const previousStep = this.previousStep
//     return {
//       identifier: this.identifier,
//       state: this.state,
//       previousStep: previousStep ? { name: previousStep.function.name, response: previousStep.response } : undefined,
//       nextStepName: this.nextStep && this.nextStep.name
//     }
//   }
// }

// class Onboarding extends CombinedScriptedDialogue<{ username?: string }> {
//   steps: {
//     start: () => {
//       return {
//         body: ["I’m Oki and I am here to help you get treated better and faster.", "Are you signing up or have you been here before?"],
//         prompt: {
//           type: "inlinePicker", choices: [
//             { body: "👋 I'm new here", value: "NEW" },
//             { body: "Been here before", value: "EXISTING" }
//           ]
//         },
//         nextStep: this.handleNewOrExisting
//       }
//     },

//     handleNewOrExisting: (response: UserResponse) => {
//       if(response === "NEW") {
//         return {
//           body: ["Welcome! Let’s get you set up!", "What’s your name?"],
//           prompt: { type: "text" },
//           nextStep: this.handleUsername
//         }
//       } else {
//         throw new Error("This branch is not implemented yet")
//       }
//     },

//     handleUsername: (response: UserResponse) => {
//       if(!response || typeof response !== "string") {
//         return {
//           body: "Please enter your name.",
//           prompt: { type: "text" },
//           nextStep: this.handleUsername
//         }
//       }

//       this.state.username = response

//       return {
//         body: `Hey ${this.state.username}.`,
//         nextStep: this.promptReferralCode
//       }
//     },

//     promptReferralCode: (response: UserResponse) => {
//       return {
//         body: "Please paste your referral code below - this would’ve been sent to you by your doctor in an email.",
//         prompt: { type: "text" },
//         nextStep: this.handleReferralCode
//       }
//     },

//     handleReferralCode: (response: UserResponse) => {
//       if(!response) {
//         return {
//           body: "Please enter the referral code you received from your doctor.",
//           prompt: { type: "text" },
//           nextStep: this.handleReferralCode
//         }
//       }

//       // TODO: Setup patient account here

//       return {
//         body: "Perfect! We also need to send you a brand new wearable. Which postcode shall we send one to?",
//         prompt: { type: "text" },
//         nextStep: this.handlePostcode
//       }
//     },

//     handlePostcode: (response: UserResponse) => {
//       if(!response) {
//         return {
//           body: "Please enter your postcode so we can send you a wearable.",
//           prompt: { type: "text" },
//           nextStep: this.handlePostcode
//         }
//       }

//       return {
//         nextStep: this.promptAddress
//       }
//     },

//     promptAddress: (response: UserResponse) => {
//       // Fetch possible addresses
//       const choices = [
//         { body: "First address", value: "First address" },
//         { body: "Second address", value: "Second address" }
//       ]

//       return {
//         body: "Please select your address.",
//         prompt: { type: "picker", choices },
//         nextStep: this.handleAddress
//       }
//     },

//     handleAddress: (response: UserResponse) => {
//       // Save the address somewhere

//       return {
//         body: [
//           "I’m on it! The device should be with you in 24 hours. Don’t forget to check back in with me when it arrives.",
//           "Now, let's transition to another dialogue"
//         ],
//         nextDialogueIdentifier: "help"
//       }
//     }
//   }
// }

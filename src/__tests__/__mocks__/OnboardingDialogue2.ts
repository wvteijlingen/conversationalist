import { AsyncStepOutput, InvalidInputError, ScriptedDialogue, StepContext } from "../.."

interface State {
  username?: string
}

export default class OnboardingDialogue extends ScriptedDialogue<State> {
  identifier = "onboarding"

  script = {
    async start(): AsyncStepOutput<State> {
      return {
        body: ["Welcome!", "What is your name?"],
        prompt: { type: "text" },
        nextStep: this.handleUsername
      }
    },

    async handleUsername(context: StepContext<State>): AsyncStepOutput<State> {
      if(typeof context.input !== "string" || !context.input.trim()) {
        throw new InvalidInputError("Please enter your name")
      }

      return {
        body: [`Hey ${context.state.username}.`, "Please upload a photo so I can see you"],
        nextStep: this.handleUserPhoto,
        state: { ...context.state, username: context.input }
      }
    },

    async handleUserPhoto(context: StepContext<State>): AsyncStepOutput<State> {
      return {
        body: "All done!"
      }
    }
  }
}

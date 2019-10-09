import { DialogueSnapshot, Script, ScriptedDialogue } from "../.."

interface State {
  username?: string
}

const script: Script<State> = {
  async start(response, state) {
    return {
      body: ["Welcome!", "What is your name?"],
      prompt: { type: "text" },
      nextStep: this.handleUsername
    }
  },

  async handleUsername(response, state) {
    if(!response || typeof response !== "string") {
      return {
        body: "Please enter your name.",
        prompt: { type: "text" },
        nextStep: this.handleUsername
      }
    }

    state.username = response

    return {
      body: [`Hey ${state.username}.`, "Please upload a photo so I can see you"],
      nextStep: this.handleUserPhoto
    }
  },

  async handleUserPhoto(response, state) {
    return {
      body: "Please paste your referral code below - this would’ve been sent to you by your doctor in an email.",
      nextStep: this.handleReferralCode
    }
  }
}

export default class OnboardingDialogue extends ScriptedDialogue<State> {
  constructor(snapshot?: DialogueSnapshot<State>) {
    super("onboarding", script, { }, snapshot)
  }
}

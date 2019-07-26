import ScriptedDialogue, { Script } from "../conversationalist/ScriptedDialogue"
import { DialogueSnapshot } from "../conversationalist/Dialogue";

interface State {
  username?: string
}

const OnboardingDialogue: Script<State> = {
  start(response, state) {
    return {
      body: ["I’m Oki and I am here to help you get treated better and faster.", "Are you signing up or have you been here before?"],
      prompt: { type: "inlinePicker", choices: [
        { body: "👋 I'm new here", value: "NEW" },
        { body: "Been here before", value: "EXISTING" }
      ]},
      nextStep: this.handleNewOrExisting
    }
  },

  handleNewOrExisting(response, state) {
    if(response === "NEW") {
      return {
        body: ["Welcome! Let’s get you set up!", "What’s your name?"],
        prompt: { type: "text" },
        nextStep: this.handleUsername
      }
    } else {
      throw new Error("This branch is not implemented yet")
    }
  },

  handleUsername(response, state) {
    if(!response || typeof response !== "string") {
      return {
        body: "Please enter your name.",
        prompt: { type: "text" },
        nextStep: this.handleUsername
      }
    }

    state.username = response

    return {
      body: `Hey ${state.username}.`,
      nextStep: this.promptReferralCode
    }
  },

  promptReferralCode(response, state) {
    return {
      body: "Please paste your referral code below - this would’ve been sent to you by your doctor in an email.",
      prompt: { type: "text" },
      nextStep: this.handleReferralCode
    }
  },

  handleReferralCode(response, state) {
    if(!response) {
      return {
        body: "Please enter the referral code you received from your doctor.",
        prompt: { type: "text" },
        nextStep: this.handleReferralCode
      }
    }

    // TODO: Setup patient account here

    return {
      body: "Perfect! We also need to send you a brand new wearable. Which postcode shall we send one to?",
      prompt: { type: "text" },
      nextStep: this.handlePostcode
    }
  },

  handlePostcode(response, state) {
    if(!response) {
      return {
        body: "Please enter your postcode so we can send you a wearable.",
        prompt: { type: "text" },
        nextStep: this.handlePostcode
      }
    }

    return {
      nextStep: this.promptAddress
    }
  },

  promptAddress(response, state) {
    // Fetch possible addresses
    const choices = [
      { body: "First address", value: "First address" },
      { body: "Second address", value: "Second address" }
    ]

    return {
      body: "Please select your address.",
      prompt: { type: "picker", choices },
      nextStep: this.handleAddress
    }
  },

  handleAddress(response, state) {
    // Save the address somewhere

    return {
      body: [
        "I’m on it! The device should be with you in 24 hours. Don’t forget to check back in with me when it arrives.",
        "Now, let's transition to another dialogue"
      ],
      nextDialogueIdentifier: "help"
    }
  }
}

export function fromSnapshot(s: DialogueSnapshot<State>) {
  return new ScriptedDialogue("onboarding", OnboardingDialogue, undefined, s)
}

export function fresh() {
  return new ScriptedDialogue("onboarding", OnboardingDialogue)
}

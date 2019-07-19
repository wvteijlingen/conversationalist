import { Dialogue } from "./Dialogue";

interface DialogueState {
  username?: string
}

const OnboardingDialogue: Dialogue<DialogueState> = {
  start(response, state) {
    return {
      body: "I’m Oki and I am here to help you get treated better and faster. Are you signing up or have you been here before?",
      prompt: { type: "prefab", choices: [
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
        nextStep: this.greeting
      }
    } else {
      throw "This branch is not implemented yet"
    }
  },

  handleUsername(response, state) {
    if(!response) {
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
      body: "TODO: Allow nil",
      nextStep: this.promptAddress
    }
  },

  promptAddress(response, state) {
    // Fetch possible addresses

    return {
      body: "Please select your address.",
      prompt: { type: "picker", options: [] },
      nextStep: this.handleAddress
    }
  },

  handleAddress(response, state) {
    // Save the address somewhere

    return {
      body: "I’m on it! The device should be with you in 24 hours. Don’t forget to check back in with me when it arrives.",
    }
  }
}

export default OnboardingDialogue

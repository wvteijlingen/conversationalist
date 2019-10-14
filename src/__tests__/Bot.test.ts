import { Bot, Script, ScriptedDialogue } from ".."
import { AsyncStepOutput, StepContext } from "../dialogues/SequentialDialogue"

const EMPTY_DIALOGUE: Script = {
  async start() { return {} }
}

describe("A bot that receives a response", () => {
  it("passes the response value to the active dialogue", done => {
    class TestDialogue extends ScriptedDialogue<{}> {
      identifier = "test"
      script = {
        async start(): AsyncStepOutput {
          return {
            body: "Specify response",
            prompt: { type: "text" },
            nextStep: this.handler
          }
        },
        async handler(context: StepContext): AsyncStepOutput {
          expect(context.input).toBe("Value")
          done()
          return {}
        }
      }
    }
    const chatBot = new Bot(new TestDialogue({ state: {} }))
    chatBot.events.messagesChanged.once(changeSet => {
      chatBot.sendUserMessage({ body: "Body", value: "Value" })
    })
    chatBot.start()
  })

  it("passes the response body to the active dialogue if there is not explicit value", done => {
    const dialogue: Script = {
      async start() {
        return {
          body: "Specify response",
          prompt: { type: "text" },
          nextStep: this.handler
        }
      },
      async handler(result) {
        expect(result).toBe("Body")
        done()
        return {}
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.events.messagesAdded.once(messages => {
      chatBot.sendUserMessage({ body: "Body" })
    })
    chatBot.start()
  })

  it("emits a messagesAdded event", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", EMPTY_DIALOGUE))
    chatBot.events.messagesAdded.on(messages => {
      expect(messages.length).toBe(1)
      expect(messages[0].body).toBe("Body")
      done()
    })
    chatBot.start()
    chatBot.sendUserMessage({ body: "Body", value: "Value" })
  })

  it("emits a messagesChanged event", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", EMPTY_DIALOGUE))
    chatBot.start()
    chatBot.events.messagesChanged.on(done)
    chatBot.sendUserMessage({ body: "Body", value: "Value" })
  })
})

describe("A bot that sends a message", () => {
  const dialogue: Script = {
    async start() {
      return { body: "Body" }
    }
  }

  it("emits a messagesAdded event", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.events.messagesAdded.on(messages => {
      expect(messages.length).toBe(1)
      expect(messages[0].body).toBe("Body")
      done()
    })
    chatBot.start()
  })

  it("emits a messagesChanged event", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.events.messagesChanged.on(done)
    chatBot.start()
  })

  it("appends the message to the messageLog", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.events.messagesAdded.on(messages => {
      expect(chatBot.messageLog.length).toBe(1)
      expect(messages[0].body).toBe("Body")
      done()
    })
    chatBot.start()
  })
})

describe("A bot that interjects a message", () => {
  it("emits a messagesAdded event", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", EMPTY_DIALOGUE))
    chatBot.start()
    chatBot.events.messagesAdded.on(messages => {
      expect(messages.length).toBe(1)
      expect(messages[0].body).toBe("Interjected message")
      done()
    })

    chatBot.interjectMessages(["Interjected message"])
  })

  it("emits a messagesChanged", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", EMPTY_DIALOGUE))
    chatBot.start()
    chatBot.events.messagesChanged.on(done)
    chatBot.interjectMessages(["Interjected message"])
  })

  it("appends the message to the messageLog", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", EMPTY_DIALOGUE))
    chatBot.start()
    chatBot.events.messagesAdded.on(messages => {
      expect(chatBot.messageLog.length).toBe(1)
      expect(messages[0].body).toBe("Interjected message")
      done()
    })

    chatBot.interjectMessages(["Interjected message"])
  })
})

describe("A bot that sends a prompt", () => {
  const prompt = { type: "text" } as const
  const dialogue: Script = {
    async start() {
      return { body: "Specify response", prompt }
    }
  }

  it("updates the activePrompt property", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.events.messagesAdded.once(messages => {
      expect(chatBot.activePrompt).toMatchObject(prompt)
      done()
    })
    chatBot.start()
  })
})

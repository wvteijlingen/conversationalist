import { Bot } from "../Bot"
import ScriptedDialogue, { Script } from "../ScriptedDialogue"

describe("middleware", () => {
  const dialogue: Script<{ }> = {
    start() {
      return {
        body: "The result",
        prompt: { type: "text" },
        nextStep: this.handler
      }
    },
    handler() {
      return {
        body: "The response"
      }
    }
  }

  it("calls each middleware before running the dialogue step", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.use({
      before: (body, value, bot) => {
        expect(body).toBe("The body")
        expect(value).toBe("The value")
        done()
        return true
      }
    })

    chatBot.start()
    chatBot.respond("The body", "The value")
  })

  it("calls each middleware after running the dialogue step", done => {
    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.use({
      after: (result, bot) => {
        expect(result.body).toBe("The result")
        done()
        return true
      }
    })

    chatBot.start()
    chatBot.respond("The body", "The value")
  })
})

describe("handling responses", () => {
  it("passes the response value to the active dialogue", done => {
    const dialogue: Script<{ }> = {
      start() {
        return {
          prompt: { type: "text" },
          nextStep: this.handler
        }
      },
      handler(result) {
        expect(result).toBe("Response value")
        done()
        return { }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.start()

    chatBot.once("messagesAdded", messages => {
      chatBot.respond("Response body", "Response value")
    })
  })

  it("passes the response body to the active dialogue if there is not explicit value", done => {
    const dialogue: Script<{ }> = {
      start() {
        return {
          prompt: { type: "text" },
          nextStep: this.handler
        }
      },
      handler(result) {
        expect(result).toBe("Response body")
        done()
        return { }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.start()

    chatBot.once("messagesAdded", messages => {
      chatBot.respond("Response body")
    })
  })
})

describe("message events", () => {
  it("emits a messagesAdded event when a bot message is added", done => {
    const dialogue: Script<{ }> = {
      start() {
        return { body: "Test message" }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.on("messagesAdded", messages => {
      expect(messages.length).toBe(1)
      const message = messages[0]
      expect(typeof message.id).toBe("string")
      expect(message.author).toBe("bot")
      expect(message.creationDate).toBeInstanceOf(Date)
      expect(message.body).toBe("Test message")
      expect(message.prompt).toBeUndefined()
      done()
    })
    chatBot.start()
  })

  it("emits a messagesAdded event when a user message is added", done => {
    const dialogue: Script<{ }> = {
      start() {
        return { }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.start()
    chatBot.on("messagesAdded", messages => {
      expect(messages.length).toBe(1)
      const message = messages[0]
      expect(typeof message.id).toBe("string")
      expect(message.author).toBe("user")
      expect(message.creationDate).toBeInstanceOf(Date)
      expect(message.body).toBe("Response body")
      expect(message.prompt).toBeUndefined()
      done()
    })
    chatBot.respond("Response body", "Response value")
  })

  it("emits a messagesAdded event when a message is interjected", done => {
    const dialogue: Script<{ }> = {
      start() {
        return { }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.start()
    chatBot.on("messagesAdded", messages => {
      expect(messages.length).toBe(1)
      const message = messages[0]
      expect(typeof message.id).toBe("string")
      expect(message.author).toBe("bot")
      expect(message.creationDate).toBeInstanceOf(Date)
      expect(message.body).toBe("Injectected message")
      expect(message.prompt).toBeUndefined()
      done()
    })
    chatBot.interjectMessages(["Injectected message"])
  })
})

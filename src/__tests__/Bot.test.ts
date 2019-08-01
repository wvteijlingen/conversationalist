import { Bot, Script, ScriptedDialogue } from ".."

describe("A bot that receives a response", () => {
  it("passes the response value to the active dialogue", done => {
    const dialogue: Script = {
      async start() {
        return {
          body: "Specify response",
          prompt: { type: "text" },
          nextStep: this.handler
        }
      },
      async handler(result) {
        expect(result).toBe("Response value")
        done()
        return { }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.once("messagesAdded", messages => {
      chatBot.respond("Response body", "Response value")
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
        expect(result).toBe("Response body")
        done()
        return { }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.once("messagesAdded", messages => {
      chatBot.respond("Response body")
    })
    chatBot.start()
  })

  it("emits a messagesAdded event", done => {
    const dialogue: Script = {
      async start() {
        return { }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.events.messagesAdded.on(messages => {
      expect(messages.length).toBe(1)
      const message = messages[0]

      expect(typeof message.id).toBe("string")
      expect(message.author).toBe("user")
      expect(message.creationDate).toBeInstanceOf(Date)
      expect(message.body).toBe("Response body")

      if(message.author !== "user") {
        fail()
      }

      done()
    })
    chatBot.start()
    chatBot.respond("Response body", "Response value")
  })
})

describe("Sending bot messages", () => {
  it("emits a messagesAdded event", done => {
    const dialogue: Script = {
      async start() {
        return { body: "Test message" }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.events.messagesAdded.on(messages => {
      expect(messages.length).toBe(1)
      const message = messages[0]
      expect(typeof message.id).toBe("string")
      expect(message.author).toBe("bot")
      expect(message.creationDate).toBeInstanceOf(Date)
      expect(message.body).toBe("Test message")
      done()
    })
    chatBot.start()
  })

  it("appends the message to the messageLog", done => {
    const dialogue: Script = {
      async start() {
        return { body: "Test message" }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    expect(chatBot.messageLog.length).toBe(0)

    chatBot.events.messagesAdded.on(messages => {
      expect(chatBot.messageLog.length).toBe(1)
      const message = messages[0]
      expect(typeof message.id).toBe("string")
      expect(message.author).toBe("bot")
      expect(message.creationDate).toBeInstanceOf(Date)
      expect(message.body).toBe("Test message")
      done()
    })
    chatBot.start()
  })
})

describe("Interjecting messages", () => {
  it("emits a messagesAdded event when a message is interjected", done => {
    const dialogue: Script = {
      async start() {
        return { }
      }
    }

    const chatBot = new Bot(new ScriptedDialogue("test", dialogue))
    chatBot.start()
    chatBot.events.messagesAdded.on(messages => {
      expect(messages.length).toBe(1)
      const message = messages[0]

      expect(typeof message.id).toBe("string")
      expect(message.author).toBe("bot")
      expect(message.creationDate).toBeInstanceOf(Date)
      expect(message.body).toBe("Interjected message")
      done()
    })

    chatBot.interjectMessages(["Interjected message"])
  })
})

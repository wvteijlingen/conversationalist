import { Bot } from "../src"
import { TestingDialogue } from "./helpers"

describe("A bot with middleware", () => {
  it("calls each middleware before running the dialogue step", done => {
    const chatBot = new Bot()
    chatBot.use({
      before: (body, value, bot) => {
        expect(body).toBe("The body")
        expect(value).toBe("The value")
        done()
        return true
      }
    })

    chatBot.sendUserMessage({ body: "The body", value: "The value" })
  })

  it("calls each middleware after running the dialogue step", done => {
    const dialogue = new TestingDialogue()
    dialogue.nextOutput = {
      messages: "The result"
    }

    const chatBot = new Bot(dialogue)

    chatBot.use({
      after: (result, bot) => {
        expect(result.messages).toBe("The result")
        done()
        return true
      }
    })

    chatBot.start()
    chatBot.sendUserMessage({ body: "The body", value: "The value" })
  })
})

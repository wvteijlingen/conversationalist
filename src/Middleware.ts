import Bot from "./Bot"
import { StepResult } from "./Dialogue"

export interface Middleware {
  /**
   * Called after a response is received by the bot, but before it is dispatched to the active dialogue.
   * If you return false, processing is halted and the response will not be passed
   * to subsequent middleware and dialogues.
   */
  before?: (body: string | undefined, value: unknown, bot: Bot) => boolean

  /**
   * Called after the active dialogue returned a step result, but before the result
   * is processed by the bot. This is not called if an error occurs in a dialogue.
   */
  after?: (stepResult: StepResult, bot: Bot) => void
}

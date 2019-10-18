interface PromptBase {
  /** Whether the user can undo the answer given to the prompt. Defaults to false. */
  isUndoAble?: boolean
}

/**
 * A prompt that shows a textfield for the user to type a response.
 */
interface TextPrompt extends PromptBase {
  type: "text"
  keyboard?: {
    autoCorrect?: boolean
    autoCapitalize?: boolean
  }
}

/**
 * A prompt that shows UI for the user to select a numerical value.
 */
interface NumericPrompt extends PromptBase {
  type: "slider"
  min: number
  max: number
}

/**
 * A prompt that displays one or multiple choices in a picker.
 */
interface PickerPrompt extends PromptBase {
  type: "picker",
  choices: Array<{
    body: string
    value: unknown
  }>
}

/**
 * A custom prompt.
 */
interface CustomPrompt extends PromptBase {
  type: "custom"
  customType: string
}

type Prompt = TextPrompt | NumericPrompt | PickerPrompt | CustomPrompt

export default Prompt

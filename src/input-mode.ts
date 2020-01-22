interface InputBase {
  /** Whether the user can undo the answer given to the prompt. Defaults to false. */
  isUndoAble?: boolean
}

/**
 * A prompt that shows a textfield for the user to type a response.
 */
interface Text extends InputBase {
  type: "text"
  keyboard?: {
    autoCorrect?: boolean
    autoCapitalize?: boolean
  }
}

/**
 * A prompt that shows UI for the user to select a numerical value.
 */
interface Numeric extends InputBase {
  type: "slider"
  min: number
  max: number
}

/**
 * A prompt that displays one or multiple choices in a picker.
 */
interface Picker extends InputBase {
  type: "picker",
  choices: Array<{
    body: string
    value: unknown
  }>
}

/**
 * A custom prompt.
 */
interface Custom extends InputBase {
  type: "custom"
  customType: string
}

type InputMode = Text | Numeric | Picker | Custom

export default InputMode

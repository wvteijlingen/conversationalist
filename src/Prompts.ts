export interface Choice {
  body: string
  value: unknown
}

interface PromptBase {
  /** Whether the user can undo the answer given to the prompt. Defaults to true. */
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
 * A prompt that displays a slider so the user can select a numerical value.
 */
interface SliderPrompt extends PromptBase {
  type: "slider"
  min: number
  max: number
}

/**
 * A prompt that displays one or multiple prefab responses in a picker.
 * Use this type over `InlinePickerPrompt` if the amount of responses is too great
 * to be displayed inline.
 */
interface PickerPrompt extends PromptBase {
  type: "picker",
  choices: Choice[]
}

/**
 * A prompt that displays one or multiple prefab responses inline.
 * Use this type over `PickerPrompt` if there is a small number of responses
 * that can be displayed inline.
 */
interface InlinePickerPrompt extends PromptBase {
  type: "inlinePicker"
  choices: Choice[]
}

/**
 * A prompt that prompts the user to connect the watch accessory.
 */
interface ConnectWatchPrompt extends PromptBase {
  type: "connectWatch",
  successValue: unknown
}

/**
 * A prompt that displays a picker to so the user can select an emotion.
 */
interface EmotionPickerPrompt extends PromptBase {
  type: "emotionPicker"
}

type Prompt = TextPrompt | SliderPrompt | PickerPrompt | InlinePickerPrompt | ConnectWatchPrompt | EmotionPickerPrompt

export default Prompt

interface TextPrompt {
  type: "text"
}

interface SliderPrompt {
  type: "slider"
}

interface InlinePickerPrompt {
  type: "inlinePicker"
  choices: Array<{ body: string, value: unknown }>
}

interface PickerPrompt {
  type: "picker",
  choices: Array<{ body: string, value: unknown }>
}

type Prompt = TextPrompt | InlinePickerPrompt | SliderPrompt | PickerPrompt

export default Prompt

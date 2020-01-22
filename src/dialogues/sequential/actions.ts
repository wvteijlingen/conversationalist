import { FinishOutput, GotoOutput, MessageOutput, PromptOutput, TransitionOutput, WaitOutput, StepOutput } from "./output"

function goto<S>(params: Omit<GotoOutput<S>, "action">): StepOutput<S> {
  return { action: "goto", ...params }
}

function message<S>(params: Omit<MessageOutput<S>, "action">): StepOutput<S> {
  return { action: "message", ...params }
}

function prompt<S>(params: Omit<PromptOutput<S>, "action">): StepOutput<S> {
  return { action: "prompt", ...params }
}

function finish<S>(params: Omit<FinishOutput<S>, "action">): StepOutput<S> {
  return { action: "finish", ...params }
}

function transition<S>(params: Omit<TransitionOutput<S>, "action">): StepOutput<S> {
  return { action: "transition", ...params }
}

function wait<S>(params: Omit<WaitOutput<S>, "action">): StepOutput<S> {
  return { action: "wait", ...params }
}

function reprompt<S>(msg: string): StepOutput<S> {
  return { action: "reprompt", msg }
}

const Action = {
  goto,
  message,
  prompt,
  finish,
  transition,
  wait,
  reprompt
}

export default Action

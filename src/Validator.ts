import { DialogueInput } from "./Dialogue"

export const isAny = (input: DialogueInput): input is any => {
  return input !== undefined && input !== null
}

export const isNumber = (input: DialogueInput): input is number => {
  return typeof input === "string" ? !isNaN(parseFloat(input)) : false
}

export const isString = (input: DialogueInput): input is string => {
  return typeof input === "string"
}

export const isNonEmptyString = (input: DialogueInput): input is string => {
  return typeof input === "string" && input.trim().length > 0
}

/**
 * An attachment that contains a single image.
 */
export interface ImageAttachment {
  type: "image"
  payload: {
    /** The url of the image. */
    href: string
  }
}

/**
 * A custom attachment with a user defined payload.
 */
export interface CustomAttachment {
  type: "custom"

  /** The custom type of the attachment. */
  customType: string

  /** Custom payload data. */
  payload: {
    [key: string]: any
  }
}

type Attachment = ImageAttachment | CustomAttachment

export default Attachment

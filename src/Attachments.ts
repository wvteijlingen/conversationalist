/**
 * An attachment that contains a single image.
 */
export interface ImageAttachment {
  type: "image"

  /** The url of the image. */
  href: string
}

/** A custom attachment. */
export interface CustomAttachment {
  type: "custom"

  /** The custom type of the attachment. */
  customType: string
}

type Attachment = ImageAttachment | CustomAttachment

export default Attachment

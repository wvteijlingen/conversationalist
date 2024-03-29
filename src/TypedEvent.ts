// Taken and adapted from https://basarat.gitbooks.io/typescript/docs/tips/typed-event.html

type Listener<T> = (event: T) => any

export interface Disposable {
  dispose(): void
}

export class TypedEvent<T> {
  private listeners: Array<Listener<T>> = []
  private listenersOncer: Array<Listener<T>> = []

  on = (listener: Listener<T>): Disposable => {
    this.listeners.push(listener)
    return {
      dispose: () => this.off(listener)
    }
  }

  once = (listener: Listener<T>): void => {
    this.listenersOncer.push(listener)
  }

  off = (listener: Listener<T>) => {
    const callbackIndex = this.listeners.indexOf(listener)
    if(callbackIndex > -1) { this.listeners.splice(callbackIndex, 1) }
  }

  emit = (event: T) => {
    /** Update any general listeners */
    this.listeners.forEach(listener => listener(event))

    /** Clear the `once` queue */
    if(this.listenersOncer.length > 0) {
      const listenersOncer = this.listenersOncer
      this.listenersOncer = []
      listenersOncer.forEach(listener => listener(event))
    }
  }

  pipe = (te: TypedEvent<T>): Disposable => {
    return this.on(e => te.emit(e))
  }
}

import { inspect } from "util"
import { urlencoded, json } from "body-parser"
import express from "express"
import { handleIncomingMessage } from "./bot"

const VERIFY_TOKEN = "ruft"

const app = express()

app.use(urlencoded({ extended: true }))
app.use(json())

app.use((req, res, next) => {
  // tslint:disable-next-line: no-console
  console.log(`${req.method} ${req.url}`)
  if(req.body) {
    // tslint:disable-next-line: no-console
    console.log(inspect(req.body, { showHidden: false, depth: null, colors: true }))
  }
  next()
})

app.get("/", function(req, res) {
  res.send("Hello World")
})

app.get("/webhook", (req, res) => {
  // Parse the query params
  const mode = req.query["hub.mode"]
  const token = req.query["hub.verify_token"]
  const challenge = req.query["hub.challenge"]

  // Checks if a token and mode is in the query string of the request
  if(mode && token) {
    // Checks the mode and token sent is correct
    if(mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      res.status(200).send(challenge)
    } else {
      // Responds with "403 Forbidden" if verify tokens do not match
      res.sendStatus(403)
    }
  }
})

app.post("/webhook", (req, res) => {
  const body = req.body

  // Checks this is an event from a page subscription
  if(body.object === "page") {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry: any) {
      const messaging = entry.messaging[0]
      handleIncomingMessage(messaging.message, messaging.sender.id)
    })

    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED")
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404)
  }

})

app.listen(3000)

const express = require('express')
const { floor, random } = Math

const MIN_FLIPS = 2
const MAX_FLIPS = 101
const COIN_SIDES = ['heads', 'tails']
const COIN_PATH = '/rng/coin'
const NCOINS_PATH = '/rng/coin/:flips'
const INDEX_PATHS = ['/', '/index']
const PORT = 3000
const app = express()

/**
 * Randomly generate "heads" or "tails".
 * @return {string} Either "heads" or "tails", randomly chosen.
 */
const flipCoin = () =>
  COIN_SIDES[floor(random() * COIN_SIDES.length)]

/**
 * Build an array containing "heads" or "tails" chosen at random.
 * @param {number} flips Number of coin flips (array size).
 * @return {string[]} Array with zero or more randomly chosen "heads"
 * or "tails".
 */
const flipCoins = (flips) =>
  Array.from({ length: flips }, flipCoin)

/**
 * Handler function for GET /rng/coin.
 * Send coin flip result as JSON.
 */
const getRngCoin = (req, res) =>
  res.json({ 'coin-flip': flipCoin() })

/**
 * Handler function for GET /rng/coin/:flips.
 * Send the result of zero or more coin flips as JSON.
 */
const getRngCoinFLIPS = (req, res) =>
  res.json({ 'coin-flips': flipCoins(req.params.flips) })

/**
 * Handler function for GET / and /index.
 * Sends html with links to the API.
 */
const getRoot = (req, res) =>
  res
    .setHeader('Content-Type', 'text/html')
    .send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Root</title>
        </head>
        <body>
          <p>Flip a coin at <a href="${COIN_PATH}">${COIN_PATH}</a></p>
          <p>Flip coins at <a href="${COIN_PATH}/5">${NCOINS_PATH}</a></p>
        </body>
      </html>`
    )


/**
 * Middleware parser and validator for the "flips" path parameter.
 */
const checkFLIPS = ({ params }, res, nxt) => {
  if (isNaN(params.flips)) {
    return nxt(new TypeError(
      `path param flips=${params.flips} is not a number`,
      { cause: 422 }))
  }

  const flips = Number(params.flips)
  if (!Number.isInteger(flips)) {
    return nxt(new TypeError(
      `path param flips=${params.flips} is not an integer`,
      { cause: 422 })
    )
  }

  if (flips < MIN_FLIPS || flips >= MAX_FLIPS) {
    const msgEnd = `out of range [${MIN_FLIPS}, ${MAX_FLIPS})`
    return nxt(new RangeError(
      `path param flips=${params.flips} ${msgEnd}`,
      { cause: 422 })
    )
  }

  params.flips = flips
  return nxt()
}

/**
 * Middleware request and response logger.
 */
const logReqRes = (req, res, nxt) => {
  res.on('finish', () =>
    console.log(
      req.socket.remoteAddress,
      req.method,
      decodeURI(req.url),
      res.statusCode,
      res.statusMessage
    ))

  nxt()
}

/**
 * Middleware error handler.
 */
const errHandler = (err, req, res, nxt) => {
  const statusCode = err.cause ?? 500
  res
    .status(statusCode)
    .json({
      error: {
        name: err.name,
        status: err.cause,
        message: err.message
      }
    })
}

/**
 * Callback port logging on server listen.
 */
const logListen = () =>
  console.log(`Listening to port ${PORT}`)


app
  .use(logReqRes)
  .get(INDEX_PATHS, getRoot)
  .get(COIN_PATH, getRngCoin)
  .get(NCOINS_PATH, checkFLIPS, getRngCoinFLIPS)
  .use(errHandler)
  .listen(PORT, logListen)

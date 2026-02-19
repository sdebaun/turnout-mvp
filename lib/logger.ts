import pino from 'pino'
import pretty from 'pino-pretty'

// pino-pretty as a synchronous stream (not a transport) avoids worker thread
// path resolution failures when Next.js bundles the module into vendor-chunks
export const logger =
  process.env.NODE_ENV === 'development'
    ? pino({ level: 'debug' }, pretty({ colorize: true }))
    : pino({ level: 'info' })

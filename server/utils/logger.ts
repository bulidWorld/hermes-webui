import { createLogger, format, transports } from 'winston'

const { combine, timestamp, printf, errors, json, colorize } = format

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp, label, ...rest }) => {
    const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : ''
    const prefix = label ? `[${label}]` : ''
    return `${timestamp} ${level} ${prefix} ${message}${extra}`
  }),
)

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
)

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new transports.Console()],
})

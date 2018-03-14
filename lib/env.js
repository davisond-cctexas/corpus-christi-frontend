'use strict'

const PREFIX = 'CC'

const ENV_VARS = [
  ['PORT']
, ['API_SYNC_INTERVAL']
, ['API_URL']
, ['CONTENT_SOURCE']
, ['MAILER_FROM']
, ['MAILER_SMTP']
, ['MAILER_TO']
, ['RECAPTCHA_SECRET']
, ['RECAPTCHA_SITE_KEY']
, ['RSS']
, ['TWITTER_ACCESS_TOKEN_KEY']
, ['TWITTER_ACCESS_TOKEN_SECRET']
, ['TWITTER_CONSUMER_KEY']
, ['TWITTER_CONSUMER_SECRET']
]

function envVarIterator(envVar) {
  const key = envVar[0]
  const optional = envVar[1]

  const fullKey = `${PREFIX}_${key}`
  const value = process.env[fullKey];

  if (!value && !optional) {
    throw new Error(`Missing ${fullKey}`)
  }

  exports[key] = value
}

ENV_VARS.forEach(envVarIterator)

exports.NODE_ENV = process.env.NODE_ENV

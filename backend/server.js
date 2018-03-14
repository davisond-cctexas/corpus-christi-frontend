'use strict'

const GoogleRecaptcha = require('google-recaptcha')

const env = require('../lib/env')
const log = require('../lib/log')
const paths = require('../lib/paths')

const DataStore = require('./DataStore/DataStore')
const HttpServer = require('./HttpServer/HttpServer')
const Mailer = require('./Mailer/Mailer')
const Rss = require('./Rss/Rss')
const Tweet = require('./Tweet/Tweet')

const googleRecaptcha = new GoogleRecaptcha({
  secret: env.RECAPTCHA_SECRET
})

const mailer = new Mailer({
  from: env.MAILER_FROM
, log: log.mailer
, smtp: env.MAILER_SMTP
, to: env.MAILER_TO
, template: paths.EMAIL_TEMPLATE
})

const tweet = new Tweet({
  accessToken: {
    key: env.TWITTER_ACCESS_TOKEN_KEY
  , secret: env.TWITTER_ACCESS_TOKEN_SECRET
  }
, consumer: {
    key: env.TWITTER_CONSUMER_KEY
  , secret: env.TWITTER_CONSUMER_SECRET
  }
, log: log.tweet
})

const dataStore = new DataStore({
  log: log.dataStore
, api: {
    url: env.API_URL
  , source: env.CONTENT_SOURCE
  }
, tweet: tweet
})

const rss = new Rss({
  log: log.rss
, url: env.RSS
})

dataStore.syncAll(function handleInitialSync(error, data) {
  if (error) {
    throw error
  }

  dataStore.defaultHandleSyncAll(error, data)

  const httpServer = new HttpServer({
    log: log.httpServer
  , mailer
  , port: env.PORT
  , viewEngine: 'pug'
  , viewPath: paths.FRONTEND
  , imagesPath: paths.IMAGES
  , faviconPath: paths.FAVICONS
  , distPath: paths.DIST
  , dataStore: dataStore
  , rss: rss
  , recaptcha: googleRecaptcha
  , recaptchaSiteKey: env.RECAPTCHA_SITE_KEY
  })

  log.server('Started HTTP Server:', httpServer)

  dataStore.syncInterval(dataStore.syncAll, env.API_SYNC_INTERVAL)
})

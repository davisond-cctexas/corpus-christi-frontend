'use strict'

const PFX = 'cc'

const debug = require('debug')

exports.browser = debug(`${PFX}:browser`)
exports.dataStore = debug(`${PFX}:dataStore`)
exports.httpServer = debug(`${PFX}:httpServer`)
exports.mailer = debug(`${PFX}:mailer`)
exports.rss = debug(`${PFX}:rss`)
exports.server = debug(`${PFX}:server`)
exports.tweet = debug(`${PFX}:tweet`)

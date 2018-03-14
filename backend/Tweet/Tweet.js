'use strict'

const _ = require('lodash')
const Autolinker = require('autolinker')
const moment = require('moment')
const Twitter = require('twitter')

const autolinker = new Autolinker({
  hashtag: 'twitter'
})

class Tweet {
  constructor(options) {
    this.log = options.log

    this.client = new Twitter({
      consumer_key: options.consumer.key
    , consumer_secret: options.consumer.secret
    , access_token_key: options.accessToken.key
    , access_token_secret: options.accessToken.secret
    })
  }

  getLatest(handle, callback) {
    const self = this

    function handleGet(error, tweets) {
      if (error) {
        self.log('Error retrieving tweets:', error)
        return callback(error)
      }

      self.log('Received tweets:', tweets)

      const rawTweet = _.take(tweets, 1)[0]

      self.log('Raw latest tweet:', rawTweet)

      const date = moment(_.get(rawTweet, 'created_at'), 'ddd MMM DD HH:mm:ss +0000 YYYY').utc()

      const latestTweet = {
        handle: _.get(rawTweet, 'user.screen_name')
      , body: autolinker.link(_.get(rawTweet, 'text'))
      , date
      , formattedDate: date.format('MMM Do')
      }

      self.log('Processed latest tweet:', latestTweet)

      return callback(null, latestTweet)
    }

    self.client.get(
      'statuses/user_timeline'
    , {
        screen_name: handle
      , exclude_replies: true
      , count: 5
      , include_rts: false
      }
    , handleGet
    )
  }
}

module.exports = Tweet

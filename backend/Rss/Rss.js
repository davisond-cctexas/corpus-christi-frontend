'use strict'

const _ = require('lodash')
const FeedParser = require('feedparser')
const request = require('request')

class Rss {
  constructor(options) {
    this.log = options.log
    this.count = options.count || 8
    this.url = options.url

    this.postMapper = this.postMapper.bind(this)
  }

  request(callback) {
    const self = this

    const feedParser = new FeedParser
    const rawPosts = []

    const handleRequest = _.once(function handleRequest(error) {
      if (error) {
        self.log('Error fetching RSS data:', error)

        return callback(error, [])
      }

      const posts = _.take(rawPosts, self.count).map(self.postMapper)
      self.log('Processed posts:', posts)

      callback(null, posts)
    })

    feedParser.on('error', handleRequest)
    feedParser.on('readable', () => {
      let rawPost

      while(rawPost = feedParser.read()) {
        rawPosts.push(rawPost)
      }

      return rawPosts
    })

    request.get(this.url, handleRequest)
      .pipe(feedParser)
  }

  postMapper(rawPost) {
    this.log('Processing raw post:', rawPost)

    const post = {
      title: rawPost.title
    , link: rawPost.link
    }

    this.log('Processed post:', post)

    return post
  }
}

module.exports = Rss

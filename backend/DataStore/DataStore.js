'use strict'

const _ = require('lodash')
const OAuth = require('oauth-1.0a')
const crypto = require('crypto')
const async = require('async')
const Autolinker = require('autolinker')
const Calendar = require('calendar').Calendar
const moment = require('moment')
const removeNewlines = require('newline-remove')
const request = require('request')
const url = require('url')
const youtube = require('js-youtube-id')
require('moment-range')

const MOCK_DATA = {
  pages: {
    error: require('./mock-data/pages/error.json')
  , departments: require('./mock-data/pages/departments.json')
  , events: require('./mock-data/pages/events.json')
  , kiosk: require('./mock-data/pages/kiosk.json')
  , services: require('./mock-data/pages/services.json')
  }
, collections: {
    departmentListings:
      require('./mock-data/collections/department-listings.json')
  , mainNavItems: require('./mock-data/collections/main-nav-items.json')
  , eventListings: require('./mock-data/collections/event-listings.json')
  , footerItems: require('./mock-data/collections/footer-items.json')
  , prriItems: require('./mock-data/collections/prri-items.json')
  , serviceCategories:
      require('./mock-data/collections/service-categories.json')
  , serviceListings: require('./mock-data/collections/service-listings.json')
  }
}

const autolinker = new Autolinker()

class Data {
  constructor(options) {
    this.api = options.api
    this.tweet = options.tweet
    this.log = options.log
    this.pages = {}
    this.collections = {}
    this.globalElements = {
      sections: {}
    , menus: {
        main: []
      , footer: []
      }
    }
    this.kiosk = {}
    this.calendar = {}
    this.syncIntervalId = -1

    // Set up the API authenticator.
    this.oauth = OAuth({
      consumer: {
        key: this.api.consumer_key,
        secret: this.api.consumer_secret
      },
      signature_method: 'HMAC-SHA1',
      hash_function: function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      },
      last_ampersand: false
    });

    // Handlers
    this.defaultHandleSyncAll = this.defaultHandleSyncAll.bind(this)

    // All
    this.syncAll = this.syncAll.bind(this)

    // Global Elements
    this.syncRedirects = this.syncRedirects.bind(this)
    this.syncGlobalElements = this.syncGlobalElements.bind(this)
    this.syncGlobalElementsSections = this.syncGlobalElementsSections.bind(this)
    this.syncGlobalElementsMenus = this.syncGlobalElementsMenus.bind(this)
    this.syncGlobalElementsMenusGeneric =
      this.syncGlobalElementsMenusGeneric.bind(this)
    this.syncGlobalElementsMenusFooters =
      this.syncGlobalElementsMenusFooters.bind(this)
    this.syncGlobalElementsMenusFooter =
      this.syncGlobalElementsMenusFooter.bind(this)

    // Pages
    this.syncPages = this.syncPages.bind(this)
    this.syncPageError = this.syncPageError.bind(this)
    this.syncPageEvents = this.syncPageEvents.bind(this)
    this.syncPageServices = this.syncPageServices.bind(this)
    this.syncPageDepartments = this.syncPageDepartments.bind(this)
    this.syncPageHomepage = this.syncPageHomepage.bind(this)

    // Collections
    this.syncCollections = this.syncCollections.bind(this)
    this.syncCollectionEventTypes = this.syncCollectionEventTypes.bind(this)
    this.syncCollectionEventListings =
      this.syncCollectionEventListings.bind(this)
    this.syncCollectionFooterItems =
      this.syncCollectionFooterItems.bind(this)
    this.syncCollectionPrriItems =
      this.syncCollectionPrriItems.bind(this)
    this.syncCollectionServiceCategories =
      this.syncCollectionServiceCategories.bind(this)
    this.syncCollectionServiceActionTypes =
      this.syncCollectionServiceActionTypes.bind(this)
    this.syncCollectionServiceListings =
      this.syncCollectionServiceListings.bind(this)
    this.syncCollectionDepartmentListings =
      this.syncCollectionDepartmentListings.bind(this)

    // Kiosk.
    this.syncKiosk = this.syncKiosk.bind(this)

    // Filters
    this.filterEventListings = this.filterEventListings.bind(this)
    this.filterServiceListings = this.filterServiceListings.bind(this)
    this.filterDepartmentListings = this.filterDepartmentListings.bind(this)

    // Calendar
    this.generateCalendar = this.generateCalendar.bind(this)

    this.log('Initialized DataStore:', this.apiUrl)
  }

  // Get
  get(uri, callback) {
    const self = this

    const cached = self.pages[uri]

    // Only pull from cache on production.
    if (cached && this.api.source !== 'staging') {
      self.log('Pulling from cache:', uri, cached)

      return callback(null, cached)
    }

    function handleRequest(error, response, body) {
      self.log('Received data:', uri, body)

      const err = error || _.get(body, 'message')

      if (err) {
        self.log('Received error:', uri, err)
        self.pages[uri] = {error: err}
        return callback(err, null)
      }

      const statusCode = response.statusCode
      self.log('Response status code:', uri, statusCode)

      if (statusCode !== 200) {
        const statusCodeError = new Error(`Bad status code ${statusCode}`)
        self.log('Received bad status code:', uri, statusCodeError)
        self.pages[uri] = {error: statusCodeError}
        return callback(statusCodeError, null)
      }

      const type = _.get(body, 'type.0.target_id')
        || _.get(body, 'type')
      self.log('Parsed type:', type)

      if (!type) {
        const typeError = new Error('Missing type.')
        self.log('Missing type:', uri)
        self.pages[uri] = {error: typeError}
        return callback(typeError, null)
      }

      var parsed

      switch (type) {
        case 'detailed_info': {
          parsed = {
            meta: _.get(body, 'meta.0', {})
          , type
          , heroImage: _.get(body, 'field_hero_image.0.url')
          , title: _.get(body, 'title.0.value')
          , text: removeNewlines(_.get(body, 'body.0.value', ''))
          , sidebars: [
              {
                headline: _.get(body, 'field_additional_wysiwyg.0.headline')
              , subheadline: _.get(body, 'field_additional_wysiwyg.0.subhead')
              , description: _.get(body, 'field_additional_wysiwyg.0.value')
              }
            , {
                headline: _.get(body, 'field_additional_links.0.headline')
              , subheadline: _.get(body, 'field_additional_links.0.subhead')
              , links: _.get(body, 'field_additional_links.0.links', [])
              }
            ]
          }
          break
        }
        case 'service': {
          parsed = {
            meta: _.get(body, 'meta.0', {})
          , type
          , heroImage: _.get(body, 'field_hero_image.0.url')
          , title: _.get(body, 'title.0.value')
          , text: removeNewlines(_.get(body, 'body.0.value', ''))
          , sidebars: [
              {
                headline: _.get(body, 'field_additional_wysiwyg.0.headline')
              , subheadline: _.get(body, 'field_additional_wysiwyg.0.subhead')
              , description: _.get(body, 'field_additional_wysiwyg.0.value')
              }
            , {
                headline: _.get(body, 'field_additional_links.0.headline')
              , subheadline: _.get(body, 'field_additional_links.0.subhead')
              , links: _.get(body, 'field_additional_links.0.links', [])
              }
            ]
          , category: _.get(body, 'field_service_category.0.target_id', '')
          }

          break
        }
        case 'service_category': {
          const sidebar = _.get(body, 'field_additional_links.0')

          parsed = {
            meta: _.get(body, 'meta.0', {})
          , type
          , id: _.get(body, 'tid.0.value')
          , name: _.get(body, 'name.0.value')
          , description: _.get(body, 'description.0.value')
          , sidebar: {
              headline: _.get(sidebar, 'headline')
            , subheadline: _.get(sidebar, 'subhead')
            , links: _.get(sidebar, 'links', [])
            }
          }

          break
        }
        case 'event': {
          const timestamp = new Date(_.get(body, 'field_event_date.0.value', 0))
          const date = moment(timestamp)
          const eventTypes = !self.collections.eventTypes.length
            ? []
            : _.get(body, 'field_event_type', []).map((type) => {
                const id = type.target_id.toString()

                return _.find(self.collections.eventTypes, {id}).name
              })

          const sidebar = _.get(body, 'field_additional_wysiwyg.0')

          parsed = {
            meta: _.get(body, 'meta.0', {})
          , type
          , timestamp: timestamp
          , title: _.get(body, 'title.0.value')
          , text: removeNewlines(_.get(body, 'body.0.value', ''))
          , location: _.get(body, 'field_location.0.value')
          , eventTypes: eventTypes
          , date
          , dateFormatted: date.format('MM/DD')
          , timeFormatted: date.format('MMMM Do, h:mma')
          , sidebar: {
              headline: _.get(sidebar, 'headline')
            , subheadline: _.get(sidebar, 'subhead')
            , description: removeNewlines(_.get(sidebar, 'value', ''))
            }
          }

          break
        }
        case 'department': {
          const rawVideo = _.get(body, 'field_video_embed.0.value')
          const rawSocialLinks = _.get(body, 'field_social_links.0')
          const socialLinks = _.omit(rawSocialLinks, 'show_tweet')
          const showTweet = _.get(rawSocialLinks, 'show_tweet', false) === '1'

          self.log('Parsed socialLinks:', socialLinks)
          self.log('Parsed show tweet:', showTweet)

          const twitterHandle = socialLinks.twitter && showTweet
            ? url.parse(socialLinks.twitter).pathname.replace('/', '')
            : null

          self.log('Parsed Twitter handle:', twitterHandle)

          parsed = {
            meta: _.get(body, 'meta.0', {})
          , type
          , id: _.get(body, 'nid.0.value')
          , heroImage: _.get(body, 'field_hero_image.0.url')
          , title: _.get(body, 'title.0.value')
          , text: _.get(body, 'body.0.value')
          , featuredLink: _.get(body, 'field_featured_link.0')
          , sidebars: [
              {
                headline: _.get(body, 'field_additional_wysiwyg.0.headline')
              , subheadline: _.get(body, 'field_additional_wysiwyg.0.subhead')
              , description: autolinker.link(
                  _.get(body, 'field_additional_wysiwyg.0.value')
                )
              }
            , {
                headline: _.get(body, 'field_additional_links.0.headline')
              , subheadline: _.get(body, 'field_additional_links.0.subhead')
              , links: _.get(body, 'field_additional_links.0.links', [])
              }
            ]
          , secondaryLink: _.get(body, 'field_secondary_featured_link.0')
          , flexContentArea: _.get(body, 'field_flex_content_area')
          , socialLinks
          , video: rawVideo
              ? 'https://www.youtube.com/embed/' + youtube(rawVideo)
              : undefined
          , quote: {
              body: _.get(body, 'field_quote.0.value')
            , author: _.get(body, 'field_quote.0.citation')
            }
          , photoContentArea: {
              imageUrl: _.get(body, 'field_photo_content_area.0.url')
            , imageAlt: _.get(body, 'field_photo_content_area.0.alt')
            , headline: _.get(body, 'field_photo_content_area.0.headline')
            , body: _.get(body, 'field_photo_content_area.0.value')
            }
          }

          if (twitterHandle) {
            return self.tweet.getLatest(twitterHandle, (error, tweet) => {
              if (error) {
                self.log('Error getting tweet:', error)
              }

              parsed.latestTweet = tweet

              self.log('Parsed data:', uri, parsed)

              self.pages[uri] = parsed

              return callback(null, parsed);
            })
          }

          break
        }
        case 'promotion_page': {
          const rawVideo = _.get(body, 'field_video_embed.0.value')
          const rawSocialLinks = _.get(body, 'field_social_links.0')
          const socialLinks = _.omit(rawSocialLinks, 'show_tweet')
          const showTweet = _.get(rawSocialLinks, 'show_tweet', false) === '1'

          self.log('Parsed socialLinks:', socialLinks)
          self.log('Parsed show tweet:', showTweet)

          const twitterHandle = socialLinks.twitter && showTweet
            ? url.parse(socialLinks.twitter).pathname.replace('/', '')
            : null

          self.log('Parsed Twitter handle:', twitterHandle)

          parsed = {
            meta: _.get(body, 'meta.0', {})
          , type
          , id: _.get(body, 'nid.0.value')
          , heroImage: _.get(body, 'field_hero_image.0.url')
          , title: _.get(body, 'title.0.value')
          , text: _.get(body, 'body.0.value')
          , featuredLink: _.get(body, 'field_featured_link.0')
          , additionalWysiwyg: {
              headline: _.get(body, 'field_additional_wysiwyg.0.headline')
            , subheadline: _.get(body, 'field_additional_wysiwyg.0.subhead')
            , description: autolinker.link(
                _.get(body, 'field_additional_wysiwyg.0.value')
              )
          }
          , flexContentArea: _.get(body, 'field_flex_content_area')
          , socialLinks
          , videoLinks: _.get(body, 'field_video_links.0', { links : [] })
          , video: rawVideo
              ? 'https://www.youtube.com/embed/' + youtube(rawVideo)
              : undefined
          , secondaryBody: _.get(body, 'field_secondary_body.0.value')
          }

          parsed.videoLinks.links = parsed.videoLinks
            ? parsed.videoLinks.links.map((link) => {
              return {
                title: link.title
              , uri: 'https://www.youtube.com/embed/' + youtube(link.uri)
              }
            })
            : []

          if (twitterHandle) {
            return self.tweet.getLatest(twitterHandle, (error, tweet) => {
              parsed.latestTweet = tweet

              self.log('Parsed data:', uri, parsed)

              self.pages[uri] = parsed

              return callback(null, parsed);
            })
          }

          break
        }
      }

      self.log('Parsed data:', uri, parsed)

      self.pages[uri] = parsed

      return callback(null, parsed)
    }

    self.log('Pulling from CMS:', uri)
    self.request(uri, handleRequest)
  }

  // Request
  request(rawUri, callback) {
    // Attach the new parameters to the content API
    var param = '_format=json'
    if (this.api.source === 'staging') {
      param = `${param}&latest`
    }

    const uri = `${rawUri}?${param}`

    this.log('Requesting URI:', uri)

    request({
      baseUrl: this.api.url,
      uri,
      json: true,
    }, callback);
  }

  // Handlers
  defaultHandleSyncAll(error, data) {
    if (error) {
      return this.log('Error syncing all:', error)
    }

    this.log('Successfully synced all:', data)

    this.pages = data.pages
    this.redirects = data.redirects
    this.kiosk = data.kiosk
    this.globalElements = data.globalElements
    this.collections = data.collections
  }

  // Sync Methods
  syncAll(callback) {
    this.log('Syncing all.')

    const tasks = {
      pages: this.syncPages
    , redirects: this.syncRedirects
    , kiosk: this.syncKiosk
    , globalElements: this.syncGlobalElements
    , collections: this.syncCollections
    }

    async.parallel(tasks, callback || this.defaultHandleSyncAll)
  }

  syncInterval(func, interval) {
    this.log('Setting sync interval (minutes):', interval)

    this.syncIntervalId = setInterval(func, interval * 60000)
  }

  syncRedirects(callback) {
    const self = this

    self.log('Syncing redirects collection.')

    function handleRequest(error, response, body) {
      const redirects = body

      self.log('Received collection redirects:', redirects)

      if (!Array.isArray(redirects)) {
        self.log('No redirects found.')

        return callback(null, [])
      }

      return callback(null, redirects);
    }

    self.request('/entity/redirects', handleRequest)
  }

  // Global Elements
  syncGlobalElements(callback) {
    this.log('Syncing global elements.')

    const tasks = {
      sections: this.syncGlobalElementsSections
    , menus: this.syncGlobalElementsMenus
    }

    async.parallel(tasks, callback)
  }

  syncGlobalElementsSections(callback) {
    const self = this

    function handleResponse(error, response, body) {
      self.log('Received global elements:', body)

      return callback(error, body);
    }

    self.request('/entity/global_elements', handleResponse)
  }

  syncGlobalElementsMenus(callback) {
    this.log('Syncing global elements menus.')

    const tasks = {
      main: this.syncGlobalElementsMenusGeneric.bind(this, 'main')
    , utilityNavigation: this.syncGlobalElementsMenusGeneric.bind(
        this
      , 'utility-navigation'
      )
    , footer: this.syncGlobalElementsMenusFooters
    }

    async.parallel(tasks, callback)
  }

  syncGlobalElementsMenusFooters(callback) {
    this.log('Syncing global elements footers.')

    const tasks = [
      this.syncGlobalElementsMenusFooter.bind(this, 1)
    , this.syncGlobalElementsMenusFooter.bind(this, 2)
    , this.syncGlobalElementsMenusFooter.bind(this, 3)
    , this.syncGlobalElementsMenusFooter.bind(this, 4)
    ]

    async.parallel(tasks, callback)
  }

  syncGlobalElementsMenusGeneric(menu, callback) {
    const self = this

    self.log('Syncing global elements menu:', menu)

    function handleRequest(error, response, body) {
      let items = _.get(body, 'items', []).map((mainItem) => {
        mainItem.weight = parseInt(mainItem.weight)
        mainItem.children.map((child) => {
          child.weight = parseInt(child.weight)

          return child
        })
        mainItem.children.sort((a, b) => a.weight - b.weight)

        return mainItem
      })
      items.sort((a, b) => a.weight - b.weight)

      self.log('Received global elements menu:', menu, items)

      return callback(null, items);
    }

    self.request(`/entity/menu_items/${menu}`, handleRequest)
  }

  syncGlobalElementsMenusFooter(id, callback) {
    const self = this

    self.log(`Syncing global elements footer #${id} menu.`)

    function handleRequest(error, response, body) {
      if (error) {
        self.log(`Error in syncGlobalElementsMenusFooter: ${error}`)
        return callback(error, null);
      }
      if (!body) {
        const noBodyErrorMessage = 'No body in syncGlobalElementsMenusFooter'
        self.log(noBodyErrorMessage)
        return callback(error, null);
      }
      const items = _.get(body, 'items', [])

      self.log(`Received global elements footer #${id} menu:`, items)

      return callback(null, items);
    }

    self.request(`/entity/menu_items/footer-${id}`, handleRequest)
  }

  // Pages
  syncPages(callback) {
    this.log('Syncing pages.')

    const tasks = {
      error: this.syncPageError
    , events: this.syncPageEvents
    , services: this.syncPageServices
    , departments: this.syncPageDepartments
    , homepage: this.syncPageHomepage
    }

    async.parallel(tasks, callback)
  }

  syncPageHomepage(callback) {
    const self = this

    self.log('Syncing homepage.')

    function handleRequest(error, response, body) {
      self.log('Received homepage:', body)

      const rawVideo = _.get(body, 'field_video_embed.0.value')

      const homepage = {
        meta: _.get(body, 'meta.0', {})
      , links: {
          government: _.get(body, 'field_government_links.0', { links: [] } )
        , info: _.get(body, 'field_info_links.0.links', { links: [] })
        , pay: _.get(body, 'field_pay_links.0.links', { links: [] })
        , report: _.get(body, 'field_report_links.0.links', { links: [] })
        , request: _.get(body, 'field_request_links.0.links', { links: [] })
        , video: _.get(body, 'field_video_links.0', { links : [] })
        , ctas: {
            primary: _.get(body, 'field_primary_links')
          , featured: _.get(body, 'field_featured_link.0')
          , additional: _.get(body, 'field_additional_link.0')
          }
        }
      , quote: _.get(body, 'field_quote.0')
      , video: rawVideo
          ? 'https://www.youtube.com/embed/' + youtube(rawVideo)
          : undefined
      }

      homepage.links.video.links = homepage.links.video
        ? homepage.links.video.links.map((link) => {
          return {
            title: link.title
          , uri: 'https://www.youtube.com/embed/' + youtube(link.uri)
          }
        })
        : []

      return callback(null, homepage);
    }

    self.request('/homepage', handleRequest)
  }

  syncPageError(callback) {
    this.log('Syncing error page.')

    const data = MOCK_DATA.pages.error

    return callback(null, data);
  }

  syncPageEvents(callback) {
    this.log('Syncing events page.')

    const data = MOCK_DATA.pages.events

    return callback(null, data);
  }

  syncPageServices(callback) {
    this.log('Syncing services page.')

    const data = MOCK_DATA.pages.services

    return callback(null, data);
  }

  syncPageDepartments(callback) {
    this.log('Syncing departments page.')

    const data = MOCK_DATA.pages.departments

    return callback(null, data);
  }

  // Collections
  syncCollections(callback) {
    this.log('Syncing collections.')

    const tasks = {
      departmentListings: this.syncCollectionDepartmentListings
    , eventTypes: this.syncCollectionEventTypes
    , eventListings: this.syncCollectionEventListings
    , prriItems: this.syncCollectionPrriItems
    , serviceCategories: this.syncCollectionServiceCategories
    , serviceListings: this.syncCollectionServiceListings
    , serviceActionTypes: this.syncCollectionServiceActionTypes
    }

    async.parallel(tasks, callback)
  }

  syncCollectionDepartmentListings(callback) {
    const self = this

    self.log('Syncing department listings collection.')

    function handleRequest(error, resonse, body) {
      self.log('Received collection department listings:', body)

      if (!Array.isArray(body)) {
        self.log('No department listings found.')

        return callback(null, [])
      }

      let mappedTerms = (body || []).map(self.mapDepartmentListings)
      mappedTerms.sort(self.sortDepartmentListings)

      self.log(
        'Mapped and sorted department listings:'
      , mappedTerms
      )

      return callback(null, mappedTerms);
    }

    self.request('/entity/departments', handleRequest)
  }

  syncCollectionEventTypes(callback) {
    const self = this

    self.log('Syncing event types collection.')

    function handleRequest(error, response, body) {
      const terms = _.get(body, 'terms')

      self.log('Received collection event types:', terms)

      if (!Array.isArray(terms)) {
        self.log('No event types found.')

        return callback(null, [])
      }

      const mappedTerms = terms.map(self.mapEventTypes)
      mappedTerms.sort(self.sortEventTypes)

      self.log(
        'Mapped and sorted event types:'
      , mappedTerms
      )

      return callback(null, mappedTerms);
    }

    self.request('/entity/taxonomy_vocabulary/terms/event_type', handleRequest)
  }

  syncCollectionServiceCategories(callback) {
    const self = this

    self.log('Syncing service categories collection.')

    function handleRequest(error, response, body) {
      const terms = _.get(body, 'terms')

      self.log('Received collection service categories:', terms)

      if (!Array.isArray(terms)) {
        self.log('No service categories found.')

        return callback(null, [])
      }

      const mappedTerms = terms.map(self.mapServiceCategories)
      mappedTerms.sort(self.sortServiceCategories)

      self.log(
        'Mapped and sorted service categories:'
      , mappedTerms
      )

      return callback(null, mappedTerms);
    }

    self.request(
      '/entity/taxonomy_vocabulary/terms/service_category'
    , handleRequest
    )
  }

  syncCollectionServiceActionTypes(callback) {
    const self = this

    self.log('Syncing service action types.')

    function handleRequest(error, response, body) {
      const terms = _.get(body, 'terms')

      self.log('Received collection service action types:', terms)

      if (!Array.isArray(terms)) {
        self.log('No service action types found.')

        return callback(null, [])
      }

      const mappedTerms = terms.map(self.mapServiceActionTypes)
      mappedTerms.sort(self.sortServiceActionTypes)

      self.log(
        'Mapped and sorted service action types:'
      , mappedTerms
      )

      return callback(null, mappedTerms);
    }

    self.request(
      '/entity/taxonomy_vocabulary/terms/service_action_type'
    , handleRequest
    )
  }

  syncCollectionEventListings(callback) {
    const self = this

    self.log('Syncing event listings collection.')

    function handleRequest(error, response, body) {
      self.log('Received collection event listings:', body)

      if (!Array.isArray(body)) {
        self.log('No event listings found.')

        return callback(null, [])
      }

      let mappedTerms = (body || []).map(self.mapEventListings)
      mappedTerms.sort(self.sortEventListings)

      self.log(
        'Mapped and sorted event listings:'
      , mappedTerms
      )

      return callback(null, mappedTerms);
    }

    self.request('/entity/events', handleRequest)
  }

  syncCollectionFooterItems(callback) {
    this.log('Syncing footer items collection.')

    const data = MOCK_DATA.collections.footerItems

    return callback(null, data);
  }

  syncCollectionPrriItems(callback) {
    this.log('Syncing PRRI items collection.')

    const data = MOCK_DATA.collections.prriItems

    return callback(null, data);
  }

  syncCollectionServiceListings(callback) {
    const self = this

    self.log('Syncing service listings collection.')

    function handleRequest(error, response, body) {
      self.log('Received collection service listings:', body)

      if (!Array.isArray(body)) {
        self.log('No service listings found.')

        return callback(null, [])
      }

      let mappedTerms = (body || []).map(self.mapServiceListings)
      mappedTerms.sort(self.sortServiceListings)

      self.log(
        'Mapped and sorted service listings:'
      , mappedTerms
      )

      return callback(null, mappedTerms);
    }

    self.request('/entity/services', handleRequest)
  }

  syncKiosk(callback) {
    const self = this

    self.log('Syncing kiosk')

    function handleResponse(error, response, body) {
      self.log('Received kiosk: ', body)

      return callback(null, body);
    }

    self.request('/entity/kiosk', handleResponse)
  }

  // Data Mappers
  mapEventListings(rawListing) {
    const timestamp = new Date(rawListing.event_date)
    const date = moment(timestamp)
    const id = rawListing.id
    const title = rawListing.title

    const listing = {
      id
    , timestamp
    , title
    , text: rawListing.event_summary
    , department: _.get(rawListing, 'field_department_reference', 0).toString()
    , eventType: rawListing.event_types ? rawListing.event_types : []
    , date
    , dateFormatted: date.format('MM/DD')
    , timeFormatted: date.format('MMMM Do, h:mma')
    , href: rawListing.path
    }

    return listing
  }

  mapDepartmentListings(rawListing) {
    const listing = {
      id: _.get(rawListing, 'nid.0.value', 0).toString()
    , path: _.get(rawListing, 'path')
    , title: _.get(rawListing, 'title.0.value')
    , links: _.get(rawListing, 'field_short_link_pile.0.links', [])
    , contact: autolinker.link(_.get(rawListing, 'field_short_contact.0.value'))
    , serviceCategory: _.get(rawListing, 'field_service_category.0.target_id', 0).toString()
    }

    return listing
  }

  mapServiceListings(rawListing) {
    const listing = {
      id: _.get(rawListing, 'nid', 0).toString()
    , title: rawListing.title
    , text: rawListing.body
    , department: _.get(rawListing, 'departmentID', 0).toString()
    , serviceCategory: _.get(rawListing, 'category[0]', 0).toString()
    , actionTypes: _.get(rawListing, 'actionTypes', []) || []
    , href: rawListing.path
    }

    return listing
  }

  mapEventTypes(rawType) {
    const type = {
      id: _.get(rawType, 'tid', 0).toString()
    , name: rawType.name
    , description: rawType.description__value
    }

    return type
  }

  mapServiceCategories(rawType) {
    const type = {
      id: _.get(rawType, 'tid', 0).toString()
    , name: rawType.name
    , description: rawType.description__value
    }

    return type
  }

  mapServiceActionTypes(rawType) {
    const type = {
      id: _.get(rawType, 'tid', 0).toString()
    , name: rawType.name
    , description: rawType.description__value
    }

    return type
  }

  // Data Sorters
  sortEventListings(a, b) {
    return a.timestamp - b.timestamp
  }

  sortServiceListings(a, b) {
    return (
      a.title.localeCompare(b.title)
    )
  }

  sortEventTypes(a, b) {
    return (
      a.name.localeCompare(b.name)
    )
  }

  sortServiceCategories(a, b) {
    return (
      a.name.localeCompare(b.name)
    )
  }

  sortServiceActionTypes(a, b) {
    return (
      a.name.localeCompare(b.name)
    )
  }

  sortDepartmentListings(a, b) {
    return (
      a.title.localeCompare(b.title)
    )
  }

  // Data Filters
  filterEventListings(query) {
    const self = this

    var start = moment()
    var end = moment().add(6, 'M')

    if (query.month) {
      start = moment(query.month).startOf('M')
      end = moment(query.month).endOf('M')
      var range = moment.range(start, end)
    } else if (query.date) {
      start = moment(query.date).startOf('D')
      end = moment(start).endOf('D')
      var range = moment.range(start, end)
    } else {
      start = moment().startOf('D')
      end = moment(start).add(120, 'M')
      var range = moment.range(start, end)
    }

    const filters = {
      department: query.department || '-1'
    , eventType: query.eventType ? query.eventType : -1
    , range: range
    }

    function filter(eventListing) {
      const matchesDepartment =
         filters.department !== '-1'
      && eventListing.department !== filters.department

      self.log(
        'Filtering by department:'
      , filters.department
      , eventListing.department
      , matchesDepartment
      )

      if (matchesDepartment) {
        return false
      }

      const eventType = _.get(_.find(
        self.collections.eventTypes, {id: filters.eventType}
      ), 'name')
      const matchesEventType =
         eventType
      && !eventListing.eventType.includes(eventType)

      self.log(
        'Filtering by eventType:'
      , eventType
      , eventListing.eventType
      , matchesEventType
      )

      if (matchesEventType) {
        return false
      }

      const matchesDateRange =
         filters.range
      && !eventListing.date.within(filters.range)

      self.log(
        'Filtering by date range:'
      , filters.range.toString()
      , eventListing.date.toString()
      , matchesDateRange
      )

      if (matchesDateRange) {
        return false
      }

      return true
    }

    return this.collections.eventListings.filter(filter)
  }

  filterServiceListings(query) {
    const self = this

    const filters = {
      department: query.department || '-1'
    , serviceCategory: query.serviceCategory || '-1'
    , actionType: query.actionType || '-1'
    }

    function filter(serviceListing) {
      const matchesDepartment =
         filters.department !== '-1'
      && serviceListing.department !== filters.department

      self.log(
        'Filtering by department:'
      , filters.department
      , serviceListing.department
      , matchesDepartment
      )

      if (matchesDepartment) {
        return false
      }

      const category = _.get(
        _.find(
          self.collections.serviceCategories
        , {id: filters.serviceCategory}
        )
      , 'name'
      )
      const matchesServiceCategory =
         filters.serviceCategory !== '-1'
      && serviceListing.serviceCategory !== category

      self.log(
        'Filtering by service category:'
      , filters.serviceCategory
      , category
      , serviceListing.serviceCategory
      , matchesServiceCategory
      )

      if (matchesServiceCategory) {
        return false
      }

      const actionType = _.get(
        _.find(
          self.collections.serviceActionTypes
        , {id: filters.actionType}
        )
      , 'name'
      )
      const matchesActionType =
        filters.actionType !== '-1'
      && !serviceListing.actionTypes.includes(actionType)

      self.log(
        'Filtering by action type:'
      , filters.actionType
      , actionType
      , serviceListing.actionTypes
      , matchesActionType
      )

      if (matchesActionType) {
        return false
      }

      return true
    }
    return this.collections.serviceListings.filter(filter)
  }

  filterDepartmentListings(query) {
    const self = this

    const filters = {
      serviceCategory: query.serviceCategory || '-1'
    }

    function filter(departmentListing) {
      const matchesServiceCategory =
         filters.serviceCategory !== '-1'
      && departmentListing.serviceCategory !== filters.serviceCategory

      self.log(
        'Filtering by service category:'
      , filters.serviceCategory
      , departmentListing.serviceCategory
      , matchesServiceCategory
      )

      if (matchesServiceCategory) {
        return false
      }

      return true
    }
    return self.collections.departmentListings.filter(filter)
  }

  // Generators
  generateCalendar(yearMonth) {
    this.log('Generating calendar:', yearMonth, !yearMonth)
    let now;

    try {
      // now = _.isEmpty(yearMonth) ? moment() : moment(yearMonth)
      now = moment()
    }
    catch (e) {
      this.log('Error' + e)
      this.log('Year Month that errored' + yearMonth)
      now = moment()
    }
    const todaysDate = moment().format('YYYY-MM-DD')

    const year = now.year()
    const month = now.month()
    const previousMonth = moment(now).subtract(1, 'M')
    const nextMonth = moment(now).add(1, 'M')

    const formattedPreviousMonth = previousMonth.format('YYYY-MM')
    const formattedNextMonth = nextMonth.format('YYYY-MM')

    if (this.calendar.month !== month) {
      const lastDateLastMonth = moment(now).subtract(1, 'M').endOf('M')
      const lastDateThisMonth = moment(now).endOf('M')
      const rawDisplay = new Calendar().monthDays(year, month)

      const zeroCount = rawDisplay[0]
        .filter(function filterNonZero(date) {
          return date === 0
        })
        .length

      const mapRows = function mapRows(row, rowIndex) {
        function mapDates(raw, index) {
          var date
          var dateFormatted
          var previous = false

          if (raw === 0) {
            date = rowIndex === 0
              ? moment(lastDateLastMonth).subtract(
                  zeroCount - index - 1
                , 'day'
                )
              : lastDateThisMonth.add(1, 'd')

            dateFormatted = date.date()
            previous = true
          } else {
            dateFormatted = raw
            date = moment(now).date(dateFormatted)
          }

          const selectedDate = date.format('YYYY-MM-DD')

          return {
            date: date
          , dateFormatted: dateFormatted
          , params: `date=${selectedDate}`
          , previous: previous
          }
        }

        return row.map(mapDates)
      }

      const display = rawDisplay.map(mapRows)

      this.calendar = {
        month: month
      , year: year
      , todaysDate: todaysDate
      , display: display
      , monthFormatted: now.format('MMMM')
      , previousMonthFormatted: formattedPreviousMonth
      , nextMonthFormatted: formattedNextMonth
      , previousMonthString: previousMonth.format('MMMM')
      , nextMonthString: nextMonth.format('MMMM')
      }
    }

    return this.calendar
  }
}

module.exports = Data

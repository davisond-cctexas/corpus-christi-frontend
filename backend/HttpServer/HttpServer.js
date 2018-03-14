'use strict'

const _ = require('lodash')
const bodyParser = require('body-parser')
const express = require('express')
const moment = require('moment')
const path = require('path')
const phoneFormatter = require('phone-formatter')
const requestModule = require('request')
const validator = require('validator')
const compression = require('compression')

class HttpServer {
  constructor(options) {
    // Initialize
    this.express = express()
    this.express.use(compression())
    this.http = require('http').createServer(this.express)
    this.log = options.log
    this.distPath = options.distPath
    this.dataStore = options.dataStore
    this.mailer = options.mailer
    this.rss = options.rss
    this.recaptcha = options.recaptcha
    this.recaptchaSiteKey = options.recaptchaSiteKey

    // Configure
    this.set('views', options.viewPath)
    this.set('view engine', options.viewEngine)

    // Static Routing
    this.use('/images', express.static(options.imagesPath))
    this.use('/favicon', express.static(options.faviconPath))
    this.use('/favicon.ico', express.static(options.faviconPath + '/favicon.ico'))

    // Enable Body Parsing
    this.use(bodyParser.json())
    this.use(bodyParser.urlencoded({extended: true}))

    // Static files.
    this.get('/base.js', this.handleGetBaseJs.bind(this))
    this.get('/styles.js', this.handleGetStylesJs.bind(this))

    // Dynamic Routing
    this.get('/api/:key', this.handleGetApi.bind(this))
    this.get('/contact-us', this.handleGetContactUs.bind(this))
    this.post('/contact-us', this.handlePostContactUs.bind(this))
    this.get('/error', this.handleGetError.bind(this))
    this.get('/search', this.handleGetSearch.bind(this))
    this.post('/search', this.handleGetSearch.bind(this))

    // Aggregates.
    this.get('/departments', this.handleGetDepartments.bind(this))
    this.get('/events', this.handleGetEvents.bind(this))
    this.get('/services', this.handleGetServices.bind(this))

    // Kiosk.
    this.get('/government/city-secretary/agendas/*', this.handleGetKiosk.bind(this))
    this.get('/government/city-secretary/agendas', this.handleKioskDefault.bind(this))
    this.get('/government/city-secretary/citycouncil', function(request, response) {
      return response.redirect(301, '/government/city-secretary/agendas/meetings')
    })

    // Wildcards.
    this.get('/', this.handleGetIndex.bind(this))
    this.get('/*', this.handleGetWildCard.bind(this))

    // Listen
    this.server = this.http.listen(
      options.port
    , this.handleListen.bind(this)
    )
  }

  // Configuration
  set(...args) {
    this.express.set(...args)
  }

  use(...args) {
    this.express.use(...args)
  }

  // Routing
  post(...args) {
    this.express.post(...args)
  }

  get(...args) {
    this.express.get(...args)
  }

  // Handlers
  handleListen() {
    const address = this.server.address()

    const host = address.address
    const port = address.port

    this.log(`Listening on ${host}:${port}`)
  }

  handleGetBaseJs(request, response) {
    this.log('Serving base.js')
    response.setHeader('Cache-Control', 'public, max-age=300')
    response.sendFile(path.join(this.distPath, 'base.bundle.js'))
  }

  handleGetStylesJs(request, response) {
    this.log('Serving styles.js')
    response.setHeader('Cache-Control', 'public, max-age=300')
    response.sendFile(path.join(this.distPath, 'styles.bundle.js'))
  }

  handleGetApi(request, response) {
    response.setHeader('Cache-Control', 'public, max-age=300')
    response.json(_.get(this.dataStore, request.params.key, null))
  }

  handleGetKiosk(request, response) {
    this.log('Serving kiosk')

    response.setHeader('Cache-Control', 'public, max-age=300')

    const currentUrl = request.path
    const kiosk = this.dataStore.kiosk
    const item = currentUrl.replace('/government/city-secretary/agendas/', '')

    // If item is blank, handle kiosk default.
    if (!item) {
      return this.handleKioskDefault(request, response)
    }

    const currentItem = _.find(kiosk, { type : item })

    if (currentItem) {
      return response.render('pages/kiosk', {
        kiosk: kiosk
      , currentUrl: currentUrl
      , currentItem: currentItem
      })
    }

    return response.render('pages/error', {
      globalElements: this.dataStore.globalElements
    , strings: this.dataStore.pages.error
    })
  }

  handleKioskDefault(request, response) {
    // Grab the first item we have in the kiosk.
    const firstItem = this.dataStore.kiosk[0]
    const path = request.path.replace(/\/\s*$/, '');

    response.setHeader('Cache-Control', 'public, max-age=300')
    return response.redirect(path + '/' + firstItem.type)
  }

  handleGetContactUs(request, response) {
    this.log('Serving contact-us.')

    response.setHeader('Cache-Control', 'public, max-age=300')
    return response.render('pages/contact-us', {
      globalElements: this.dataStore.globalElements
    , recaptchaSiteKey: this.recaptchaSiteKey
    , query: {}
    , validity: {}
    })
  }

  handlePostContactUs(request, response) {
    const self = this

    self.log('Serving POST contact-us.')

    const query = request.body

    self.log('Received query:', query)

    function handleSend(error, info) {
      if (error) {
        self.log('Error sending email:', error, query)

        response.setHeader('Cache-Control', 'public, max-age=300')
        return response.render('pages/contact-us', {
          globalElements: self.dataStore.globalElements
        , message: {
            value: 'Error submitting form. Please try again.'
          , level: 'priority'
          }
        , query
        , validity: {}
        })
      }

      self.log('Email sent successful:', info)

      response.setHeader('Cache-Control', 'public, max-age=300')
      return response.render('pages/contact-us', {
        globalElements: self.dataStore.globalElements
      , message: {
          value: 'Form submitted successfully!'
        , level: 'positive'
        }
      , query: {}
      , validity: {}
      })
    }

    const hasEmail = !validator.isEmpty(query.email)
    const isEmail =  validator.isEmail(query.email)
    const hasQuestion = !validator.isEmpty(query.describe)
    const validity = {hasEmail, isEmail, hasQuestion}

    if (
      !hasQuestion
      || (hasQuestion && hasEmail && !isEmail)
    ) {
      self.log('Invalid form:', validity)

      response.setHeader('Cache-Control', 'public, max-age=300')
      return response.render('pages/contact-us', {
        globalElements: self.dataStore.globalElements
      , message: {
          value: 'Form is invalid. Please check and try again.'
        , level: 'priority'
        }
      , query
      , validity
      })
    }

    self.recaptcha.verify({
      response: query['g-recaptcha-response']
    }, (error) => {
      if (error) {
        response.setHeader('Cache-Control', 'public, max-age=300')
        return response.render('pages/contact-us', {
          globalElements: self.dataStore.globalElements
        , message: {
            value:
              'Captcha was not completed. Please try again.'
          , level: 'priority'
          }
        , query
        , validity
        })
      }


      const phone = phoneFormatter.format(query.phone, '(NNN) NNN-NNNN')
      self.mailer.send({
        email: query.email
      , subject: 'New Contact Form Request'
      , name: query.name
      , phone
      , category: query.category
      , question: query.describe
      }, handleSend)
    })
  }

  handleGetError(request, response) {
    this.log('Serving error')
    const strings = this.dataStore.pages.error

    return response.render('pages/error', {
      strings: strings
    })
  }

  handleGetSearch(request, response) {
    const searchParameter = _.get(request, 'query.q', '');
    const currentPage = parseInt(_.get(request, 'query.page', ''));
    const apiUrl = _.get(this, 'dataStore.api.url', '');

    const searchUrl = `${apiUrl}/entity/search_rest_results/${searchParameter}?_format=json${currentPage ? '&page=' + currentPage : ''}`;

    requestModule.get(searchUrl, (err, res) => {
      if (err) {
        self.log('Error: ', err);
      }
      let searchResults = JSON.parse(_.get(res, 'body', '{}'));

      // Normalize responses
      searchResults.page = parseInt(searchResults.page);
      searchResults.total_pages = parseInt(searchResults.total_pages);
      searchResults.limit = parseInt(searchResults.limit);

      response.setHeader('Cache-Control', 'public, max-age=300')
      response.render('pages/search', {
          globalElements: this.dataStore.globalElements,
          searchResults: searchResults,
          query: searchParameter
      });
    });
  }

  handleGetDepartments(request, response) {
    this.log('Serving departments.')

    const pageLimit = 20
    const strings = this.dataStore.pages.departments
    const collections = this.dataStore.collections

    const query = request.query
    this.log('Received query:', query)

    const filters = _.omit(query, 'page')
    const page = parseInt(query.page ? query.page - 1 : 0)

    const departmentListings = Object.keys(filters).length > 0
      ? this.dataStore.filterDepartmentListings(query)
      : collections.departmentListings

    const paginated = departmentListings.slice(
      page * pageLimit
    , (page + 1) * pageLimit
    )
    this.log('Paginated:', page * pageLimit, (page + 1) * pageLimit, paginated)

    return response.render('pages/departments', {
      strings
    , globalElements: this.dataStore.globalElements
    , collections: {
        departmentListings: paginated
      , serviceCategories: collections.serviceCategories
      }
    , query
    , queryParams: this.serialize(filters)
    , page: page + 1
    , totalPages: Math.ceil(departmentListings.length / pageLimit)
    })
  }

  handleGetEvents(request, response) {
    this.log('Serving events.')

    const pageLimit = 6
    const strings = this.dataStore.pages.events
    const collections = this.dataStore.collections

    const query = request.query
    this.log('Received query:', query)

    var selectedMonth
    if (query.date){
      selectedMonth = moment(query.date).format('MMMM YYYY')
    } else {
      selectedMonth = query.month
    }
    const calendar = this.dataStore.generateCalendar(selectedMonth)

    var titleDate = ''
    if (query.date){
      titleDate = moment(query.date).format('MMMM D, YYYY')
    } else if (query.month){
      titleDate = moment(query.month).format('MMMM YYYY')
    }

    const filters = _.omit(query, 'page')
    const page = parseInt(query.page ? query.page - 1 : 0)

    const eventListings = this.dataStore.filterEventListings(query)

    const paginated = eventListings.slice(
      page * pageLimit
    , (page + 1) * pageLimit
    )
    this.log('Paginated:', page * pageLimit, (page + 1) * pageLimit, paginated)

    response.setHeader('Cache-Control', 'public, max-age=300')
    return response.render('pages/events', {
      strings
    , globalElements: this.dataStore.globalElements
    , calendar
    , titleDate: titleDate
    , collections: {
        departmentListings: collections.departmentListings
      , eventTypes: collections.eventTypes
      , eventListings: paginated
      }
    , query
    , queryParams: this.serialize(filters)
    , queryParamsNoDate: this.serialize(_.omit(filters, ['date', 'month']))
    , page: page + 1
    , totalPages: Math.ceil(eventListings.length / pageLimit)
    , today: moment().startOf('D').valueOf()
    })
  }

  handleGetServices(request, response) {
    this.log('Serving services.')

    const pageLimit = 6
    const strings = this.dataStore.pages.services
    const collections = this.dataStore.collections

    const query = request.query
    this.log('Received query:', query)

    const filters = _.omit(query, 'page')
    const page = parseInt(query.page ? query.page - 1 : 0)

    const serviceListings = Object.keys(filters).length > 0
      ? this.dataStore.filterServiceListings(query)
      : collections.serviceListings

    const paginated = serviceListings.slice(
      page * pageLimit
    , (page + 1) * pageLimit
    )
    this.log('Paginated:', page * pageLimit, (page + 1) * pageLimit, paginated)

    response.setHeader('Cache-Control', 'public, max-age=300')
    return response.render('pages/services', {
      strings
    , globalElements: this.dataStore.globalElements
    , collections: {
        departmentListings: collections.departmentListings
      , serviceCategories: collections.serviceCategories
      , serviceActionTypes: collections.serviceActionTypes
      , serviceListings: paginated
      }
    , query
    , queryParams: this.serialize(filters)
    , queryParamsNoActionType: this.serialize(_.omit(filters, ['actionType']))
    , page: page + 1
    , totalPages: Math.ceil(serviceListings.length / pageLimit)
    })
  }

  handleGetIndex(request, response) {
    const self = this

    self.log('Serving index.')

    const dataStore = self.dataStore
    const collections = dataStore.collections

    const homepage = dataStore.pages.homepage
    const actionTypes = collections.serviceActionTypes

    function handleRssRequest(error, data) {
      response.setHeader('Cache-Control', 'public, max-age=300')
      return response.render('pages/index', {
        globalElements: dataStore.globalElements
      , collections: {
          events: _.take(dataStore.filterEventListings({}), 5)
        , rssItems: data || []
        }
      , homepage
      , actionLinks: {
          pay: _.find(actionTypes, ['name', 'Pay'])
        , report: _.find(actionTypes, ['name', 'Report'])
        , request: _.find(actionTypes, ['name', 'Request'])
        , info: _.find(actionTypes, ['name', 'Info'])
        }
      , _: require('lodash')
      })
    }

    self.rss.request(handleRssRequest)
  }

  handleGetWildCard(request, response) {
    const self = this
    const dataStore = self.dataStore
    const redirects = dataStore.redirects
    const globalElements = dataStore.globalElements

    const uri = request.originalUrl

    self.log('Serving wildcard route:', uri)

    function handleRequest(error, data) {
      // Check to see if this is a 301 redirect first.
      const redirect = _.find(redirects, _.matchesProperty('from', uri))
      if (redirect) {
        return response.redirect(redirect.status_code, redirect.to)
      }

      if (error) {
        return response.render('pages/error', {
          globalElements
        , strings: dataStore.pages.error
        })
      }

      const type = data.type;

      switch (type) {
        case 'department': {
          const department = {
            meta: data.meta
          , heroImage: data.heroImage
          , title: data.title
          , latestTweet: data.latestTweet
          , description: data.text
          , featuredLink: data.featuredLink
          , sidebars: data.sidebars
          , secondaryLink: data.secondaryLink
          , flexContentArea: data.flexContentArea
          , socialLinks: data.socialLinks
          , video: data.video
          , quote: data.quote
          , photoContentArea: data.photoContentArea
          }

          self.log('Requested department:', department)

          return response.render('pages/department', {
            globalElements
          , department
          , collections: {
              serviceListings: self.dataStore.filterServiceListings({
                department: data.id.toString()
              })
            }
          })
        }

        case 'detailed_info': {
          const info = {
            meta: data.meta
          , heroImage: data.heroImage
          , title: data.title
          , description: data.text
          , sidebars: data.sidebars
          }

          return response.render('pages/detailed-info', {
            globalElements
          , info
          })
        }
        case 'service': {
          const serviceCategories = dataStore.collections.serviceCategories

          const service = {
            meta: data.meta
          , heroImage: data.heroImage
          , title: data.title
          , description: data.text
          , sidebars: data.sidebars
          , category: _.find(serviceCategories, {id: data.category.toString()})
          }

          self.log('Requested service:', service)

          return response.render('pages/service', {
            globalElements
          , service
          })
        }
        case 'service_category': {
          const serviceCategory = {
            meta: data.meta
          , id: data.id
          , name: data.name
          , description: data.description
          , sidebar: data.sidebar
          }

          return response.render('pages/service-category', {
            globalElements
          , serviceCategory
          , collections: {
              serviceListings: self.dataStore.filterServiceListings({
                serviceCategory: serviceCategory.id.toString()
              })
            }
          })
        }
        case 'event': {
          const event = {
            meta: data.meta
          , title: data.title
          , description: data.text
          , time: data.date.format('h:mm a')
          , date: data.date.format('MMMM D, YYYY')
          , location: data.location
          , tags: data.eventTypes
          , sidebar: data.sidebar
          }

          self.log('Requested event:', event)

          return response.render('pages/event', {
            globalElements
          , event
          })
        }
        case 'promotion_page': {
          const promo = {
            meta: data.meta
          , heroImage: data.heroImage
          , title: data.title
          , latestTweet: data.latestTweet
          , description: data.text
          , featuredLink: data.featuredLink
          , additionalWysiwyg: data.additionalWysiwyg
          , secondaryLink: data.secondaryLink
          , flexContentArea: data.flexContentArea
          , socialLinks: data.socialLinks
          , videoLinks: data.videoLinks
          , video: data.video
          , secondaryBody: data.secondaryBody
          }

          self.log('Requested promotion page:', promo)

          response.setHeader('Cache-Control', 'public, max-age=300')
          return response.render('pages/promotion', {
            globalElements
          , promo
          , _: require('lodash')
          })
        }
      }
    }

    self.dataStore.get(uri, handleRequest)
  }

  serialize(obj) {
    const params = []
    const keys = Object.keys(obj)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    }

    return params.join('&')
  }
}

module.exports = HttpServer

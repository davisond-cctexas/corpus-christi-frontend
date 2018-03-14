'use strict'

const h2p = require('html2plaintext')
const nodemailer = require('nodemailer')
const pug = require('pug')

class Mailer {
  constructor(options) {
    this.log = options.log
    this.from = options.from
    this.to = options.to
    this.template = options.template
    this.transporter = nodemailer.createTransport(options.smtp)
  }

  send(options, callback) {
    const self = this

    const html = pug.renderFile(self.template, options)
    const text = h2p(html)

    function handleSend(error, info) {
      if (error) {
        self.log('Error sending message:', error)
        return callback(error, info)
      }

      self.log('Message successfully sent:', info)
      return callback(null, info)
    }

    self.log('Sending mail', self.from, self.to, options)

    self.transporter.sendMail({
      from: self.from
    , to: self.to
    , subject: options.subject
    , text
    , html
    }, handleSend)
  }
}

module.exports = Mailer

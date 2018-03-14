'use strict'

const path = require('path')

const LIB = __dirname
exports.LIB = LIB

const ROOT = path.join(LIB, '..')
exports.ROOT = ROOT

const DIST = path.join(ROOT, 'dist')
exports.DIST = DIST

const FRONTEND = path.join(ROOT, 'frontend')
exports.FRONTEND = FRONTEND

const IMAGES = path.join(FRONTEND, 'images')
exports.IMAGES = IMAGES

const FAVICONS = path.join(FRONTEND, 'favicon')
exports.FAVICONS = FAVICONS

const EMAIL_TEMPLATE = path.join(FRONTEND, '/pages/email.pug')
exports.EMAIL_TEMPLATE = EMAIL_TEMPLATE

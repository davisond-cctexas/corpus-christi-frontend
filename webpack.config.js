'use strict'

const webpack = require('webpack')

const paths = require('./lib/paths')

const uglifyPlugin = new webpack.optimize.UglifyJsPlugin()

module.exports = {
  module: {
    loaders: [
      {
        test: /\.js$/
      , exclude: /node_modules/
      , loaders: [
          'babel-loader?presets[]=es2015'
        ]
      }
    , {test: /\.(woff|woff2|ttf|eot|svg|png|jpg|ico)$/, loader: 'url-loader'}
    , {test: /\.css$/, loaders: ['style', 'css', 'postcss']}
    , {test: /\.scss$/, loaders: ['style', 'css', 'postcss', 'sass']}
    ]
  }
, resolve: {
    root: [
      paths.LIB
    ]
  }
, entry: {
    base: './frontend/js/base.js'
  , styles: './frontend/js/styles.js'
  }
, output: {
    path: './dist'
  , filename: '[name].bundle.js'
  }
, plugins: [
    uglifyPlugin
  ]
}

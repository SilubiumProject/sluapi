var silubiumjs = require('bitcoinjs-lib')

Object.assign(silubiumjs.networks, require('./networks'))

silubiumjs.utils = require('./utils')

module.exports = silubiumjs
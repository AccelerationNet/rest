/*
 * Copyright 2012-2016 the original author or authors
 * @license MIT, see LICENSE.txt for details
 *
 * @author Jeremy Grelle
 * @author Scott Andrews
 */

'use strict'

var interceptor = require('../interceptor')
var delay = require('../util/delay')

/**
 * Retries a rejected request using an exponential backoff.
 *
 * Defaults to an initial interval of 100ms, a multiplier of 2, and no max interval.
 *
 * @param {Client} [client] client to wrap
 * @param {number} [config.intial=100] initial interval in ms
 * @param {number} [config.multiplier=2] interval multiplier
 * @param {number} [config.max] max interval in ms
 *
 * @returns {Client}
 */
module.exports = interceptor({

  init: function (config) {
    config.initial = config.initial || 100
    config.multiplier = config.multiplier || 2
    config.max = config.max || Infinity
    config.maxTries = config.maxTries || Infinity
    return config
  },

  error: function (response, config, meta) {
    var request = response.request
    request.retry = request.retry || config.initial
    request.try = request.try || 0

    return delay(request.retry, request).then(function (request) {
      if (request.canceled) {
        // cancel here in case client doesn't check canceled flag
        return Promise.reject({ request: request, error: 'precanceled' })
      }
      request.retry = Math.min(request.retry * config.multiplier, config.max)
      request.try += 1
      if (request.try >= config.maxTries) {
        // cancel here if we have exceeded the maximum number of retries
        return Promise.reject({ request: request, error: 'maxretries' })
      }
      return meta.client(request)
    })
  }

})

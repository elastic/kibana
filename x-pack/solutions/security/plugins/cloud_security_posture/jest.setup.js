/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This is a fix for the BroadcastChannel API not being available in JSDOM.
// This is a temporary workaround until JSDOM supports BroadcastChannel.
// https://github.com/mswjs/data/issues/306
// https://github.com/elastic/kibana/pull/208427
class BroadcastChannelMock {
  constructor() {
    this.onmessage = null;
  }
  postMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
  }
}
global.BroadcastChannel = BroadcastChannelMock;

// msw 3 reads `Headers.getSetCookie()` on every mocked response; the whatwg-fetch polyfill
// Kibana uses in JSDOM doesn't implement it.
if (typeof Headers.prototype.getSetCookie !== 'function') {
  Headers.prototype.getSetCookie = function getSetCookie() {
    const value = this.get('set-cookie');
    return value ? [value] : [];
  };
}

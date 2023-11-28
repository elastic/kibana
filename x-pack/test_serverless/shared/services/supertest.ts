/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
// @ts-ignore internal modules are not typed
import TestAgent from 'supertest/lib/agent';
// @ts-ignore internal modules are not typed
import Test from 'supertest/lib/test';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

const methods = ['get', 'post', 'put', 'head', 'delete'];

methods.forEach(function (method) {
  TestAgent.prototype[method] = function (url: any, fn: any) {
    const req = new Test(this.app, method.toUpperCase(), url);
    if (this._options.http2) {
      req.http2();
    }

    if (this._host) {
      req.set('host', this._host);
    }

    req.on('response', this._saveCookies.bind(this));
    req.on('redirect', this._saveCookies.bind(this));
    req.on('redirect', this._attachCookies.bind(this, req));
    this._setDefaults(req);
    // The only change to the module original logic is to avoid caching cookies in agent
    // this._attachCookies(req);

    return req;
  };
});

export function SupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl(config.get('servers.kibana'));
  const ca = config.get('servers.kibana').certificateAuthorities;

  return supertest.agent(kbnUrl, { ca });
}

export function SupertestWithoutAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });
  const ca = config.get('servers.kibana').certificateAuthorities;

  return supertest.agent(kbnUrl, { ca });
}

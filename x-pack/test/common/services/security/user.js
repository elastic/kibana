/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Wreck from 'wreck';

export class User {
  constructor(url, log) {
    this._log = log;
    this._wreck = Wreck.defaults({
      headers: { 'kbn-xsrf': 'ftr/services/uiSettings' },
      baseUrl: url,
      json: true,
      redirects: 3,
    });
  }

  async create(username, user) {
    this._log.debug(`creating user ${username}`);
    const { res, payload } = await this._wreck.post(`/api/security/v1/users/${username}`, { payload: {
      username,
      ...user
    } });
    if (res.statusCode !== 200) {
      throw new Error(`Expected status code of 200, received ${res.statusCode}: ${payload}`);
    }
  }

  async delete(username) {
    const { res, payload } = await this._wreck.delete(`/api/security/v1/users/${username}`);
    if (res.statusCode !== 204) {
      throw new Error(`Expected status code of 204, received ${res.statusCode}: ${payload}`);
    }
  }
}

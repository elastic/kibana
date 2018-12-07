/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Wreck from 'wreck';

export class Role {
  constructor(url, log) {
    this._log = log;
    this._wreck = Wreck.defaults({
      headers: { 'kbn-xsrf': 'ftr/services/uiSettings' },
      baseUrl: url,
      json: true,
      redirects: 3,
    });
  }

  async create(name, role) {
    this._log.debug(`creating role ${name}`);
    const { res, payload } = await this._wreck.put(`/api/security/role/${name}`, { payload: role });
    if (res.statusCode !== 204) {
      throw new Error(`Expected status code of 204, received ${res.statusCode}: ${payload}`);
    }
  }

  async delete(name) {
    const { res, payload } = await this._wreck.delete(`/api/security/role/${name}`);
    if (res.statusCode !== 204) {
      throw new Error(`Expected status code of 204, received ${res.statusCode}: ${payload}`);
    }
  }
}

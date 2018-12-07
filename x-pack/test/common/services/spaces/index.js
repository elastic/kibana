/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { format as formatUrl } from 'url';
import Wreck from 'wreck';

export function SpacesProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));
  return new class Security {
    constructor(url, log) {
      this._log = log;
      this._wreck = Wreck.defaults({
        headers: { 'kbn-xsrf': 'ftr/services/uiSettings' },
        baseUrl: url,
        json: true,
        redirects: 3,
      });
    }

    async create(space) {
      const { res, payload } = await this._wreck.post('/api/spaces/space', {
        payload: space
      });

      if (res.statusCode !== 200) {
        throw new Error(`Expected status code of 200, received ${res.statusCode}: ${payload}`);
      }
    }

    async delete(spaceId) {
      const { res, payload } = await this._wreck.delete(`/api/spaces/space/${spaceId}`);

      if (res.statusCode !== 204) {
        throw new Error(`Expected status code of 204, received ${res.statusCode}: ${payload}`);
      }
    }
  }(url, log);
}

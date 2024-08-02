/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Space } from '@kbn/spaces-plugin/common';
import Axios from 'axios';
import Https from 'https';
import { format as formatUrl } from 'url';
import util from 'util';
import { FtrProviderContext } from '../ftr_provider_context';

export function SpacesServiceProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  const certificateAuthorities = config.get('servers.kibana.certificateAuthorities');
  const httpsAgent: Https.Agent | undefined = certificateAuthorities
    ? new Https.Agent({
        ca: certificateAuthorities,
        // required for self-signed certificates used for HTTPS FTR testing
        rejectUnauthorized: false,
      })
    : undefined;

  const axios = Axios.create({
    headers: { 'kbn-xsrf': 'x-pack/ftr/services/spaces/space' },
    baseURL: url,
    maxRedirects: 0,
    validateStatus: () => true, // we do our own validation below and throw better error messages
    httpsAgent,
  });

  return new (class SpacesService {
    public async create(space: any) {
      log.debug(`creating space ${space.id}`);
      const { data, status, statusText } = await axios.post('/api/spaces/space', space);

      if (status !== 200) {
        throw new Error(
          `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
        );
      }
      log.debug(`created space ${space.id}`);
    }

    public async delete(spaceId: string) {
      log.debug(`deleting space id: ${spaceId}`);
      const { data, status, statusText } = await axios.delete(`/api/spaces/space/${spaceId}`);

      if (status !== 204) {
        log.debug(
          `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
        );
      }
      log.debug(`deleted space id: ${spaceId}`);
    }

    public async getAll() {
      log.debug('retrieving all spaces');
      const { data, status, statusText } = await axios.get<Space[]>('/api/spaces/space');

      if (status !== 200) {
        throw new Error(
          `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
        );
      }
      log.debug(`retrieved ${data.length} spaces`);

      return data;
    }
  })();
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { format as formatUrl } from 'url';
import Wreck from 'wreck';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { LogService } from '../../../types/services';

export class SpacesService {
  private log: LogService;
  private wreck: any;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.wreck = Wreck.defaults({
      headers: { 'kbn-xsrf': 'ftr/services/uiSettings' },
      baseUrl: url,
      redirects: 3,
    });
  }

  public async create(space: any) {
    this.log.debug('creating space');
    const { res, payload } = await this.wreck.post('/api/spaces/space', {
      payload: space,
    });

    if (res.statusCode !== 200) {
      throw new Error(`Expected status code of 200, received ${res.statusCode}: ${payload}`);
    }
  }

  public async delete(spaceId: string) {
    this.log.debug(`deleting space: ${spaceId}`);
    const { res, payload } = await this.wreck.delete(`/api/spaces/space/${spaceId}`);

    if (res.statusCode !== 204) {
      throw new Error(`Expected status code of 204, received ${res.statusCode}: ${payload}`);
    }
  }
}

export function SpacesServiceProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));
  return new SpacesService(url, log);
}

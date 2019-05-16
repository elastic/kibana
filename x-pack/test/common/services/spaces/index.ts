/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios, { AxiosInstance } from 'axios';
import { format as formatUrl } from 'url';
import util from 'util';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { LogService } from '../../../types/services';

export class SpacesService {
  private log: LogService;
  private axios: AxiosInstance;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/spaces/space' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we do our own validation below and throw better error messages
    });
  }

  public async create(space: any) {
    this.log.debug('creating space');
    const { data, status, statusText } = await this.axios.post('/api/spaces/space', space);

    if (status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug('created space');
  }

  public async delete(spaceId: string) {
    this.log.debug(`deleting space: ${spaceId}`);
    const { data, status, statusText } = await this.axios.delete(`/api/spaces/space/${spaceId}`);

    if (status !== 204) {
      throw new Error(
        `Expected status code of 204, received ${status} ${statusText}: ${util.inspect(data)}`
      );
    }
    this.log.debug(`deleted space: ${spaceId}`);
  }
}

export function SpacesServiceProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));
  return new SpacesService(url, log);
}

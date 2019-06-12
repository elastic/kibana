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
import { Features } from '../features';

export class FeaturesService {
  private readonly axios: AxiosInstance;

  constructor(url: string, private readonly log: LogService) {
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/features' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we'll handle our own statusCodes and throw informative errors
    });
  }

  public async get(): Promise<Features> {
    this.log.debug(`requesting /api/features/v1 to get the features`);
    const response = await this.axios.get('/api/features/v1');

    if (response.status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${response.status} ${
          response.statusText
        }: ${util.inspect(response.data)}`
      );
    }

    const features = response.data.reduce(
      (acc: Features, feature: any) => ({
        ...acc,
        [feature.id]: {
          navLinkId: feature.navLinkId,
        },
      }),
      {}
    );
    return features;
  }
}

export function FeaturesProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  return new FeaturesService(url, log);
}

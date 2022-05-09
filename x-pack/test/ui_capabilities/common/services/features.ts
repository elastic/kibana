/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosInstance } from 'axios';
import { format as formatUrl } from 'url';
import util from 'util';
import { ToolingLog } from '@kbn/tooling-log';
import { FtrProviderContext } from '../ftr_provider_context';
import { Features } from '../features';

export class FeaturesService {
  private readonly axios: AxiosInstance;

  constructor(url: string, private readonly log: ToolingLog) {
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/features' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we'll handle our own statusCodes and throw informative errors
    });
  }

  public async get({ ignoreValidLicenses } = { ignoreValidLicenses: false }): Promise<Features> {
    this.log.debug('requesting /api/features to get the features');
    const response = await this.axios.get(
      `/api/features?ignoreValidLicenses=${ignoreValidLicenses}`
    );

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
          app: feature.app,
        },
      }),
      {}
    );
    return features;
  }
}

export function FeaturesProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  return new FeaturesService(url, log);
}

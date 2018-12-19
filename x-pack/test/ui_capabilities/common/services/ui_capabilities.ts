/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cheerio from 'cheerio';
import { UICapabilities } from 'ui/capabilities';
import { format as formatUrl } from 'url';
import Wreck from 'wreck';
import { TestInvoker } from '../../../common/types';
import { LogService } from '../../../types/services';

export interface BasicCredentials {
  username: string;
  password: string;
}

export class UICapabilitiesService {
  private readonly log: LogService;
  private readonly wreck: any;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.wreck = Wreck.defaults({
      baseUrl: url,
      redirects: 0,
    });
  }

  public async get(
    credentials: BasicCredentials | null,
    spaceId?: string
  ): Promise<UICapabilities | null> {
    const spaceUrlPrefix = spaceId ? `/s/${spaceId}` : '';
    this.log.debug('requesting /app/kibana to parse the uiCapabilities');
    const headers = credentials
      ? {
          Authorization: `Basic ${Buffer.from(
            `${credentials.username}:${credentials.password}`
          ).toString('base64')}`,
        }
      : {};
    const { res, payload } = await this.wreck.get(`${spaceUrlPrefix}/app/kibana`, {
      headers,
    });

    if (res.statusCode !== 200) {
      throw new Error(`Expected status code of 200, received ${res.statusCode}: ${payload}`);
    }

    const dom = cheerio.load(payload.toString());
    const element = dom('kbn-injected-metadata');
    if (!element) {
      return null;
    }

    const json = element.attr('data');
    const data = JSON.parse(json);
    return data.vars.uiCapabilities as UICapabilities;
  }
}

export function UICapabilitiesProvider({ getService }: TestInvoker) {
  const log = getService('log');
  const config = getService('config');
  const noAuthUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: undefined,
  });

  return new UICapabilitiesService(noAuthUrl, log);
}

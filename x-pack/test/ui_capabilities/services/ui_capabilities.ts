/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import cheerio from 'cheerio';
import { format as formatUrl } from 'url';
import Wreck from 'wreck';
import { LogService, TestInvoker } from '../../common/types';

export interface UICapabilities {
  navLinks: {
    [navLinkId: string]: boolean;
  };
}

export class UICapabilitiesService {
  private readonly log: LogService;
  private readonly wreck: Wreck;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.wreck = Wreck.defaults({
      baseUrl: url,
      redirects: 3,
    });
  }

  public async get(): Promise<UICapabilities> {
    this.log.debug('requesting /app/kibana to parse the uiCapabilities');
    const { res, payload } = await this.wreck.get('/app/kibana');

    if (res.statusCode !== 200) {
      throw new Error(`Expected status code of 200, received ${res.statusCode}: ${payload}`);
    }

    const dom = cheerio.load(payload.toString());
    const element = dom('kbn-injected-metadata');
    const json = element.attr('data');
    const data = JSON.parse(json);
    return data.vars.uiCapabilities as UICapabilities;
  }
}

export function UICapabilitiesProvider({ getService }: TestInvoker) {
  const log = getService('log');
  const config = getService('config');
  const url = formatUrl(config.get('servers.kibana'));

  return new UICapabilitiesService(url, log);
}

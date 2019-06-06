/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios, { AxiosInstance } from 'axios';
import cheerio from 'cheerio';
import { UICapabilities } from 'ui/capabilities';
import { format as formatUrl } from 'url';
import util from 'util';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';
import { LogService } from '../../../types/services';

export interface BasicCredentials {
  username: string;
  password: string;
}

export enum GetUICapabilitiesFailureReason {
  RedirectedToRoot = 'Redirected to Root',
  NotFound = 'Not Found',
}

interface GetUICapabilitiesResult {
  success: boolean;
  value?: UICapabilities;
  failureReason?: GetUICapabilitiesFailureReason;
}

export class UICapabilitiesService {
  private readonly log: LogService;
  private readonly axios: AxiosInstance;

  constructor(url: string, log: LogService) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/ui_capabilities' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we'll handle our own statusCodes and throw informative errors
    });
  }

  public async get({
    credentials,
    spaceId,
  }: {
    credentials?: BasicCredentials;
    spaceId?: string;
  }): Promise<GetUICapabilitiesResult> {
    const spaceUrlPrefix = spaceId ? `/s/${spaceId}` : '';
    this.log.debug(`requesting ${spaceUrlPrefix}/app/kibana to parse the uiCapabilities`);
    const requestHeaders = credentials
      ? {
          Authorization: `Basic ${Buffer.from(
            `${credentials.username}:${credentials.password}`
          ).toString('base64')}`,
        }
      : {};
    const response = await this.axios.get(`${spaceUrlPrefix}/app/kibana`, {
      headers: requestHeaders,
    });

    if (response.status === 302 && response.headers.location === '/') {
      return {
        success: false,
        failureReason: GetUICapabilitiesFailureReason.RedirectedToRoot,
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        failureReason: GetUICapabilitiesFailureReason.NotFound,
      };
    }

    if (response.status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${response.status} ${
          response.statusText
        }: ${util.inspect(response.data)}`
      );
    }

    const dom = cheerio.load(response.data.toString());
    const element = dom('kbn-injected-metadata');
    if (!element) {
      throw new Error('Unable to find "kbn-injected-metadata" element');
    }

    const dataAttrJson = element.attr('data');

    try {
      const dataAttr = JSON.parse(dataAttrJson);
      return {
        success: true,
        value: dataAttr.capabilities as UICapabilities,
      };
    } catch (err) {
      throw new Error(
        `Unable to parse JSON from the kbn-injected-metadata data attribute: ${dataAttrJson}`
      );
    }
  }
}

export function UICapabilitiesProvider({ getService }: KibanaFunctionalTestDefaultProviders) {
  const log = getService('log');
  const config = getService('config');
  const noAuthUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: undefined,
  });

  return new UICapabilitiesService(noAuthUrl, log);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios, { AxiosInstance } from 'axios';
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
    navLinks,
    spaceId,
  }: {
    credentials?: BasicCredentials;
    navLinks?: Record<string, boolean>;
    spaceId?: string;
  }): Promise<GetUICapabilitiesResult> {
    const spaceUrlPrefix = spaceId ? `/s/${spaceId}` : '';
    this.log.debug(`requesting ${spaceUrlPrefix}/api/capabilities to get the uiCapabilities`);
    const requestOptions = credentials ? { auth: credentials } : {};
    const response = await this.axios.post(
      `${spaceUrlPrefix}/api/capabilities`,
      { capabilities: { navLinks } },
      requestOptions
    );

    if (response.status === 302 && response.headers.location === '/') {
      return {
        success: false,
        failureReason: GetUICapabilitiesFailureReason.RedirectedToRoot,
      };
    }

    if (response.status !== 200) {
      throw new Error(
        `Expected status code of 200, received ${response.status} ${
          response.statusText
        }: ${util.inspect(response.data)}`
      );
    }

    return {
      success: true,
      value: response.data.capabilities,
    };
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios, { AxiosInstance } from 'axios';
import { UICapabilities } from 'ui/capabilities';
import { format as formatUrl } from 'url';
import util from 'util';
import { ToolingLog } from '@kbn/dev-utils';
import { FtrProviderContext } from '../ftr_provider_context';
import { FeaturesService, FeaturesProvider } from './features';

export interface BasicCredentials {
  username: string;
  password: string;
}

export enum GetUICapabilitiesFailureReason {
  RedirectedToSpaceSelector = 'Redirected to Space Selector',
  NotFound = 'Not Found',
}

interface GetUICapabilitiesResult {
  success: boolean;
  value?: UICapabilities;
  failureReason?: GetUICapabilitiesFailureReason;
}

export class UICapabilitiesService {
  private readonly log: ToolingLog;
  private readonly axios: AxiosInstance;
  private readonly featureService: FeaturesService;

  constructor(url: string, log: ToolingLog, featureService: FeaturesService) {
    this.log = log;
    this.axios = axios.create({
      headers: { 'kbn-xsrf': 'x-pack/ftr/services/ui_capabilities' },
      baseURL: url,
      maxRedirects: 0,
      validateStatus: () => true, // we'll handle our own statusCodes and throw informative errors
    });
    this.featureService = featureService;
  }

  public async get({
    credentials,
    spaceId,
  }: {
    credentials?: BasicCredentials;
    spaceId?: string;
  }): Promise<GetUICapabilitiesResult> {
    const features = await this.featureService.get();
    const applications = Object.values(features)
      .map((feature) => feature.navLinkId)
      .filter((link) => !!link);

    const spaceUrlPrefix = spaceId ? `/s/${spaceId}` : '';
    this.log.debug(
      `requesting ${spaceUrlPrefix}/api/core/capabilities to parse the uiCapabilities`
    );
    const requestHeaders = credentials
      ? {
          Authorization: `Basic ${Buffer.from(
            `${credentials.username}:${credentials.password}`
          ).toString('base64')}`,
        }
      : {};
    const response = await this.axios.post(
      `${spaceUrlPrefix}/api/core/capabilities`,
      { applications: [...applications, 'kibana:stack_management'] },
      {
        headers: requestHeaders,
      }
    );

    if (response.status === 302 && response.headers.location === '/spaces/space_selector') {
      return {
        success: false,
        failureReason: GetUICapabilitiesFailureReason.RedirectedToSpaceSelector,
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

    return {
      success: true,
      value: response.data,
    };
  }
}

export function UICapabilitiesProvider(context: FtrProviderContext) {
  const log = context.getService('log');
  const config = context.getService('config');
  const noAuthUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: undefined,
  });

  return new UICapabilitiesService(noAuthUrl, log, FeaturesProvider(context));
}

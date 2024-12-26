/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { type AxiosRequestConfig } from 'axios';
import type { MicrosoftDefenderEndpointApiTokenResponse } from '@kbn/stack-connectors-plugin/common/microsoft_defender_endpoint/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { catchAxiosErrorFormatAndThrow } from '../../../../common/endpoint/format_axios_error';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';
import { DEFAULT_API_URL, DEFAULT_OAUTH_SCOPE, DEFAULT_OAUTH_SERVER_URL } from './constants';
import { dump } from '../../common/utils';

interface MicrosoftDefenderEndpointApiClientOptions {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  oAuthServerUrl?: string;
  oAuthScope?: string;
  apiUrl?: string;
  log?: ToolingLog;
}

/**
 * A client to interact with the Microsoft Defender for Endpoint APIs
 */
export class MicrosoftDefenderEndpointApiClient {
  private apiAuth: Promise<{ token: string }> | undefined = undefined;
  protected readonly options: Required<Omit<MicrosoftDefenderEndpointApiClientOptions, 'log'>>;
  protected log: ToolingLog;

  constructor({
    tenantId,
    clientId,
    clientSecret,
    oAuthServerUrl = DEFAULT_OAUTH_SERVER_URL,
    oAuthScope = DEFAULT_OAUTH_SCOPE,
    apiUrl = DEFAULT_API_URL,
    log = createToolingLogger(),
  }: MicrosoftDefenderEndpointApiClientOptions) {
    this.log = log;

    this.options = {
      tenantId,
      clientId,
      clientSecret,
      oAuthServerUrl,
      oAuthScope,
      apiUrl,
    };
  }

  protected async request<T>(requestOptions: AxiosRequestConfig): Promise<T> {
    let accessToken = '';

    if (!this.apiAuth) {
      this.apiAuth = new Promise<{ token: string }>((resolve) => {
        (async () => {
          const url = new URL(this.options.oAuthServerUrl);
          url.pathname = `/${this.options.tenantId}/oauth2/v2.0/token`;

          this.log.debug(`Requesting new API Bearer token`);

          const {
            data: { access_token: token },
          } = await axios<MicrosoftDefenderEndpointApiTokenResponse>({
            url: url.toString(),
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            data: {
              grant_type: 'client_credentials',
              client_id: this.options.clientId,
              scope: this.options.oAuthScope,
              client_secret: this.options.clientSecret,
            },
          }).then((response) => {
            this.log.debug(`New api Bearer token created`);
            this.log.verbose(dump(response.data));

            return response;
          });

          return { token };
        })();
      });
    }

    accessToken = (await this.apiAuth).token;

    return axios({
      ...requestOptions,
      headers: {
        ...(requestOptions.headers || {}),
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then((res) => res.data)
      .catch(catchAxiosErrorFormatAndThrow);
  }

  /**
   * Generates a defined (machine/host) onboarding script which can then be downloaded on to
   * the desired machine for onboarding it to Microsoft Defender for Endpoint management system.
   */
  public async fetchDeviceOnboardingPackageUrl(): Promise<{ url: string }> {}
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';
import Url from 'url';
import { FtrService, FtrProviderContext } from '../ftr_provider_context';

export interface Credentials {
  username: string;
  password: string;
}

function extractCookieValue(authResponse: AxiosResponse) {
  return authResponse.headers['set-cookie'][0].toString().split(';')[0].split('sid=')[1] as string;
}
export class AuthService extends FtrService {
  private readonly kibanaServer = this.ctx.getService('kibanaServer');
  private readonly config = this.ctx.getService('config');

  constructor(ctx: FtrProviderContext) {
    super(ctx);
  }

  public async login({ username, password }: Credentials) {
    const headers = {
      'content-type': 'application/json',
      'kbn-version': await this.kibanaServer.version.get(),
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    };

    const baseUrl = Url.format({
      protocol: this.config.get('servers.kibana.protocol'),
      hostname: this.config.get('servers.kibana.hostname'),
      port: this.config.get('servers.kibana.port'),
    });

    const loginUrl = baseUrl + '/internal/security/login';
    const provider = baseUrl.includes('localhost') ? 'basic' : 'cloud-basic';

    const authBody = {
      providerType: 'basic',
      providerName: provider,
      currentURL: `${baseUrl}/login?next=%2F`,
      params: { username, password },
    };

    const authResponse = await axios.post(loginUrl, authBody, { headers });

    return {
      name: 'sid',
      value: extractCookieValue(authResponse),
      url: baseUrl,
    };
  }
}

export const AuthProvider = (ctx: FtrProviderContext) => new AuthService(ctx);

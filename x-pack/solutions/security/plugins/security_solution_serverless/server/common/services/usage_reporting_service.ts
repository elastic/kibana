/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestInit, Response } from 'node-fetch';

import fetch from 'node-fetch';
import https from 'https';

import { SslConfig, sslSchema } from '@kbn/server-http-tools';

import type { UsageRecord } from '../../types';
import type { UsageApiConfigSchema, TlsConfigSchema } from '../../config';

import { USAGE_REPORTING_ENDPOINT, USAGE_SERVICE_USAGE_URL } from '../../constants';

export class UsageReportingService {
  private agent: https.Agent | undefined;

  constructor(private readonly config: UsageApiConfigSchema) {}

  public async reportUsage(records: UsageRecord[]): Promise<Response> {
    const reqArgs: RequestInit = {
      method: 'post',
      body: JSON.stringify(records),
      headers: { 'Content-Type': 'application/json' },
    };
    if (this.usageApiUrl.includes('https')) {
      reqArgs.agent = this.httpAgent;
    }
    return fetch(this.usageApiUrl, reqArgs);
  }

  private get tlsConfigs(): NonNullable<TlsConfigSchema> {
    if (!this.config.tls) {
      throw new Error('UsageReportingService: usageApi.tls configs not provided');
    }

    return this.config.tls;
  }

  private get usageApiUrl(): string {
    if (!this.config.url) {
      return USAGE_SERVICE_USAGE_URL;
    }

    return `${this.config.url}${USAGE_REPORTING_ENDPOINT}`;
  }

  private get httpAgent(): https.Agent {
    if (this.agent) {
      return this.agent;
    }

    if (!this.config.enabled) {
      this.agent = new https.Agent({ rejectUnauthorized: false });
      return this.agent;
    }

    const tlsConfig = new SslConfig(
      sslSchema.validate({
        enabled: true,
        certificate: this.tlsConfigs.certificate,
        key: this.tlsConfigs.key,
        certificateAuthorities: this.tlsConfigs.ca,
      })
    );

    this.agent = new https.Agent({
      rejectUnauthorized: tlsConfig.rejectUnauthorized,
      cert: tlsConfig.certificate,
      key: tlsConfig.key,
      ca: tlsConfig.certificateAuthorities,
    });

    return this.agent;
  }
}

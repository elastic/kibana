/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent } from 'undici';

import { SslConfig, sslSchema } from '@kbn/server-http-tools';

import type { UsageRecord } from '../../types';
import type { UsageApiConfigSchema, TlsConfigSchema } from '../../config';

export class UsageReportingService {
  private agent: Agent | undefined;

  constructor(
    private readonly config: UsageApiConfigSchema,
    private readonly kibanaVersion: string
  ) {}

  public async reportUsage(records: UsageRecord[]): Promise<Response> {
    const reqArgs: RequestInit = {
      method: 'post',
      body: JSON.stringify(records),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Kibana/${this.kibanaVersion} node-fetch`,
      },
    };
    if (this.usageApiUrl.includes('https')) {
      (reqArgs as RequestInit & { dispatcher: Agent }).dispatcher = this.httpAgent;
    }
    return fetch(this.usageApiUrl, reqArgs);
  }

  private get tlsConfigs(): NonNullable<TlsConfigSchema> {
    if (!this.config.tls) {
      throw new Error('usage-api TLS configs not provided');
    }

    return this.config.tls;
  }

  private get usageApiUrl(): string {
    if (!this.config.url) {
      throw new Error('usage-api url not provided');
    }

    return this.config.url;
  }

  private get httpAgent(): Agent {
    if (this.agent) {
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

    this.agent = new Agent({
      connect: {
        rejectUnauthorized: tlsConfig.rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
        ca: tlsConfig.certificateAuthorities,
        allowPartialTrustChain: true,
      },
    });

    return this.agent;
  }
}

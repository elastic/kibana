/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientOptions } from '@kbn/test';
import { KbnClient } from '@kbn/test';

export type StackAuth =
  | {
      type: 'basic';
      username: string;
      password: string;
    }
  | {
      type: 'apiKey';
      /**
       * Base64-encoded Elasticsearch API key value (without the "ApiKey " prefix).
       */
      apiKey: string;
    };

export interface StackConnectionOptions {
  kibanaUrl: string;
  elasticsearchUrl: string;
  auth: StackAuth;
  spaceId?: string;
}

const buildUrlWithCredentials = (url: string, username: string, password: string): string => {
  const u = new URL(url);
  u.username = username;
  u.password = password;
  return u.toString();
};

export const createEsClient = ({ elasticsearchUrl, auth }: StackConnectionOptions): Client => {
  const isHttps = (() => {
    try {
      return new URL(elasticsearchUrl).protocol === 'https:';
    } catch {
      return false;
    }
  })();

  return new Client({
    node: elasticsearchUrl,
    auth:
      auth.type === 'apiKey'
        ? { apiKey: auth.apiKey }
        : { username: auth.username, password: auth.password },
    requestTimeout: 60_000,
    // Local serverless dev often uses self-signed TLS on https://localhost:9200
    ...(isHttps ? { tls: { rejectUnauthorized: false } } : {}),
  });
};

class AuthenticatedKbnClient extends KbnClient {
  private readonly defaultHeaders: Record<string, string>;

  constructor(options: KbnClientOptions, defaultHeaders: Record<string, string>) {
    super(options);
    this.defaultHeaders = defaultHeaders;
  }

  public override async request<T>(options: Parameters<KbnClient['request']>[0]) {
    return super.request<T>({
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...(options.headers ?? {}),
      },
    });
  }
}

export const createKbnClient = ({
  kibanaUrl,
  auth,
  spaceId,
  log,
}: StackConnectionOptions & { log: ToolingLog }): KbnClient => {
  const url = (() => {
    if (!spaceId) return kibanaUrl;

    const base = new URL(kibanaUrl);
    // Preserve Kibana basePath (e.g. /kbn) if present
    const basePath = base.pathname.replace(/\/+$/, ''); // trim trailing slashes
    base.pathname = `${basePath}/s/${spaceId}`;
    return base.toString();
  })();

  if (auth.type === 'basic') {
    const options: KbnClientOptions = {
      log,
      // KbnClient uses the URL (including credentials) to do basic auth.
      url: buildUrlWithCredentials(url, auth.username, auth.password),
    };
    return new KbnClient(options);
  }

  const options: KbnClientOptions = {
    log,
    url,
  };

  return new AuthenticatedKbnClient(options, {
    Authorization: `ApiKey ${auth.apiKey}`,
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Kibana HTTP client — adds kbn-xsrf header and uses Kibana base URL.
 * Supports Kibana Spaces via the `spaceId` option (prepends `/s/{spaceId}` to all paths).
 */
export class KibanaClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly spacePrefix: string;

  constructor({
    baseUrl,
    apiKey,
    user,
    password,
    spaceId,
  }: {
    baseUrl: string;
    apiKey?: string;
    user?: string;
    password?: string;
    spaceId?: string;
  }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.spacePrefix = spaceId && spaceId !== 'default' ? `/s/${spaceId}` : '';
    this.headers = {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
    };

    if (apiKey) {
      this.headers.Authorization = `ApiKey ${apiKey}`;
    } else if (user && password) {
      const creds = Buffer.from(`${user}:${password}`).toString('base64');
      this.headers.Authorization = `Basic ${creds}`;
    }
  }

  async request(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: unknown }> {
    const url = `${this.baseUrl}${this.spacePrefix}${path}`;
    const init: RequestInit = { method, headers: { ...this.headers } };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    try {
      const resp = await fetch(url, init);
      const text = await resp.text();
      try {
        return { status: resp.status, body: JSON.parse(text) };
      } catch {
        return { status: resp.status, body: text };
      }
    } catch (err) {
      console.error(`ERROR: Kibana connection failed: ${(err as Error).message}`);
      return { status: 0, body: (err as Error).message };
    }
  }

  get(path: string) {
    return this.request('GET', path);
  }

  post(path: string, body?: unknown) {
    return this.request('POST', path, body);
  }

  patch(path: string, body?: unknown) {
    return this.request('PATCH', path, body);
  }

  delete(path: string) {
    return this.request('DELETE', path);
  }

  getSpacePrefix(): string {
    return this.spacePrefix;
  }
}

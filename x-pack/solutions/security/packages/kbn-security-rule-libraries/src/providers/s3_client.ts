/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sign } from 'aws4';
import type { Request } from 'aws4';
import { ensureOk, send } from '../http';
import type { RuleLibraryAttributes } from '../types';

const DEFAULT_REGION = 'us-east-1';

const decodeXml = (text: string): string =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const tagValues = (xml: string, tag: string): string[] =>
  [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map(([, value]) =>
    decodeXml(value)
  );

const encodeKey = (key: string): string => key.split('/').map(encodeURIComponent).join('/');

// provider.url is the bucket endpoint, e.g. https://s3.eu-west-1.amazonaws.com/bucket or http://localhost:9000/bucket.
// Layout: <branch>/v<version>/rules/<folder>/<file>.json. Auth s3_access_key: username = access key id, secret = secret key.
export class S3Client {
  private readonly base: URL;
  private readonly region: string;
  private readonly credentials?: { accessKeyId: string; secretAccessKey: string };

  constructor({ provider, secret }: RuleLibraryAttributes) {
    if (!provider.url) throw new Error('S3 provider requires a url');
    this.base = new URL(provider.url);
    this.region = provider.region ?? DEFAULT_REGION;
    if (provider.authType === 's3_access_key') {
      if (!provider.username || !secret) {
        throw new Error('Auth type "s3_access_key" requires a username and secret');
      }
      this.credentials = { accessKeyId: provider.username, secretAccessKey: secret };
    }
  }

  private async get(path: string, query: string = ''): Promise<Buffer> {
    const basePath = this.base.pathname.replace(/\/$/, '');
    const fullPath = `${basePath}${path}${query ? `?${query}` : ''}`;
    const request: Request = {
      host: this.base.host,
      path: fullPath,
      service: 's3',
      region: this.region,
    };
    const headers: Record<string, string> = { Host: this.base.host };
    if (this.credentials) {
      sign(request, this.credentials);
      for (const [name, value] of Object.entries(request.headers ?? {})) {
        headers[name] = String(value);
      }
    }
    const url = `${this.base.protocol}//${this.base.host}${fullPath}`;
    return ensureOk(await send(url, { headers }));
  }

  async list(prefix: string, delimiter?: string): Promise<{ keys: string[]; prefixes: string[] }> {
    const keys: string[] = [];
    const prefixes: string[] = [];
    let token: string | undefined;
    do {
      const params = new URLSearchParams({ 'list-type': '2', prefix });
      if (delimiter) params.set('delimiter', delimiter);
      if (token) params.set('continuation-token', token);
      const xml = (await this.get('/', params.toString())).toString('utf8');
      keys.push(...tagValues(xml, 'Key'));
      const common = [...xml.matchAll(/<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g)];
      prefixes.push(...common.flatMap(([, block]) => tagValues(block, 'Prefix')));
      token =
        tagValues(xml, 'IsTruncated')[0] === 'true'
          ? tagValues(xml, 'NextContinuationToken')[0]
          : undefined;
    } while (token);
    return { keys, prefixes };
  }

  object(key: string): Promise<Buffer> {
    return this.get(`/${encodeKey(key)}`);
  }
}

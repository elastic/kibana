/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { joinKibanaUrl } from './join_kibana_url';
import type { FpTpLiveKbnRequest } from './seed_live';

/**
 * Builds the `FpTpLiveKbnRequest` the manual seed script sends to a real Kibana:
 * `ApiKey` auth for serverless projects (no basic-auth users), `Basic` otherwise.
 */
export const createLiveKbnRequest = ({
  kibanaUrl,
  apiKey,
  username,
  password,
}: {
  kibanaUrl: string;
  apiKey?: string;
  username: string;
  password: string;
}): FpTpLiveKbnRequest => {
  const authorization = apiKey
    ? `ApiKey ${apiKey}`
    : `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  return async ({ method, path, body, version }) => {
    const headers: Record<string, string> = {
      Authorization: authorization,
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
      'Content-Type': 'application/json',
    };
    if (version !== undefined) {
      headers['elastic-api-version'] = version;
    }

    const response = await fetch(joinKibanaUrl(kibanaUrl, path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }
    return { statusCode: response.status, body: parsed };
  };
};

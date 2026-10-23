/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { joinKibanaUrl } from './join_kibana_url';
import type { FpTpLiveKbnRequest } from './seed_live';

/**
 * Builds a live Kibana request function for the manual seeder.
 *
 * `apiKey` authenticates with an ApiKey (serverless); without it the request
 * falls back to Basic auth (classic stack). `space` scopes every request to a
 * Kibana space, so the detection engine, Entity Store, workflows, and inference
 * settings APIs all act inside that space.
 */
export const createLiveKbnRequest = ({
  kibanaUrl,
  apiKey,
  username,
  password,
  space,
}: {
  kibanaUrl: string;
  apiKey?: string;
  username?: string;
  password?: string;
  space?: string;
}): FpTpLiveKbnRequest => {
  const authorization =
    apiKey !== undefined && apiKey.length > 0
      ? `ApiKey ${apiKey}`
      : `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;

  return async ({ method, path, body, version }) => {
    const scopedPath = space !== undefined && space !== 'default' ? `/s/${space}${path}` : path;
    const headers: Record<string, string> = {
      Authorization: authorization,
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'kibana',
      'Content-Type': 'application/json',
    };
    if (version !== undefined) {
      headers['elastic-api-version'] = version;
    }

    const response = await fetch(joinKibanaUrl(kibanaUrl, scopedPath), {
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

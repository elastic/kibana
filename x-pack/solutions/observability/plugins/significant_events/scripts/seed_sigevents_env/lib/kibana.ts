/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeoutSignal } from '@kbn/std';
import type { ConnectionConfig } from './get_connection_config';

export function generateAuthHeader(config: ConnectionConfig): string {
  return `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
}

const REQUEST_TIMEOUT_MS = 30_000;

export async function kibanaRequest(
  config: ConnectionConfig,
  method: string,
  path: string,
  body?: unknown,
  space: string = 'default'
): Promise<{ status: number; data: unknown }> {
  const spacePath = space === 'default' ? path : `/s/${encodeURIComponent(space)}${path}`;
  const deadline = timeoutSignal(REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${config.kibanaUrl}${spacePath}`, {
        method,
        signal: deadline,
        headers: {
          'Content-Type': 'application/json',
          Authorization: generateAuthHeader(config),
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'Kibana',
          'elastic-api-version': '2023-10-31',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'AbortError' || name === 'TimeoutError') {
        throw new Error(
          `kibanaRequest: ${method} ${path} timed out after ${REQUEST_TIMEOUT_MS}ms — is Kibana reachable at ${config.kibanaUrl}?`
        );
      }
      throw err;
    }

    const contentType = response.headers.get('content-type') ?? '';
    let data: unknown;
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text().catch(() => null);
    }

    return { status: response.status, data };
  } finally {
    deadline.dispose();
  }
}

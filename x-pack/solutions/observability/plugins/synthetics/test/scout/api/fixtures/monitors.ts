/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { PUBLIC_API_VERSION } from './constants';

/**
 * Thin wrapper around `POST /api/synthetics/monitors` for Scout API specs.
 *
 * Mirrors the FTR `addMonitorAPIHelper` from
 * `apis/synthetics/create_monitor.ts` but uses `apiClient` instead of
 * `supertest`. The caller supplies the auth headers (typically API key +
 * internal origin).
 *
 * The `elastic-api-version` header is required because this is a versioned
 * public API route (`router.versioned.post`).
 */
export async function addMonitor(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  monitor: Record<string, unknown>,
  opts: { gettingStarted?: boolean; savedObjectType?: string; statusCode?: number } = {}
) {
  const { gettingStarted, savedObjectType, statusCode = 200 } = opts;
  const qs: string[] = [];
  if (gettingStarted) qs.push('gettingStarted=true');
  if (savedObjectType) qs.push(`savedObjectType=${savedObjectType}`);
  const path = `api/synthetics/monitors${qs.length ? `?${qs.join('&')}` : ''}`;

  const res = await apiClient.post(path, {
    headers: { ...headers, 'elastic-api-version': PUBLIC_API_VERSION },
    body: monitor,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

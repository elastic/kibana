/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, omitBy } from 'lodash';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  removeMonitorEmptyValues,
  transformPublicKeys,
} from '../../../../server/routes/monitor_cruds/formatters/saved_object_to_monitor';
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

/**
 * Thin wrapper around `PUT /api/synthetics/monitors/{id}` for Scout API specs.
 *
 * Mirrors the FTR `editMonitorAPIHelper` from the `edit_monitor_public_api*`
 * suites. The caller supplies the auth headers (typically API key + internal
 * origin) and the expected `statusCode`.
 */
export async function editMonitor(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  monitorId: string,
  monitor: unknown,
  opts: { statusCode?: number } = {}
) {
  const { statusCode = 200 } = opts;
  const res = await apiClient.put(`api/synthetics/monitors/${monitorId}`, {
    headers: { ...headers, 'elastic-api-version': PUBLIC_API_VERSION },
    body: monitor,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

/**
 * Keys removed from the *expected* monitor input before comparing it against a
 * create/edit response. Ported verbatim from the FTR `create_monitor.ts`
 * `keyToOmitList`.
 */
export const keyToOmitList = [
  'created_at',
  'updated_at',
  'id',
  'config_id',
  'form_monitor_type',
  'spaceId',
  'private_locations',
];

/**
 * Normalizes an *expected* monitor input the same way the public API
 * serializes a monitor saved object: applies the public-key transform, drops
 * server-generated keys, then strips empty values. Mirrors `omitMonitorKeys`
 * from the FTR `create_monitor.ts` so migrated specs can assert deep equality.
 */
export const omitMonitorKeys = (monitor: Record<string, unknown>) =>
  omitBy(
    omit(transformPublicKeys(monitor as Parameters<typeof transformPublicKeys>[0]), keyToOmitList),
    removeMonitorEmptyValues
  );

const RESPONSE_OMIT_KEYS = ['created_at', 'updated_at', 'id', 'config_id', 'form_monitor_type'];

/**
 * Strips the server-generated fields from a create/edit response body so it
 * can be compared against `omitMonitorKeys(expectedInput)`. Mirrors the
 * response-side `omit(...)` in the FTR add/edit helpers.
 */
export const parseMonitorResponse = (body: Record<string, unknown>) =>
  omit(body, RESPONSE_OMIT_KEYS);

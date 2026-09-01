/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { SYNTHETICS_API_URLS } from './constants';

export interface ParamPayload {
  key: string;
  value: string;
  tags?: string[];
  description?: string;
  share_across_spaces?: boolean;
}

const paramsPath = (spaceId?: string, suffix = '') =>
  `${spaceId ? `s/${spaceId}` : ''}${SYNTHETICS_API_URLS.PARAMS}${suffix}`.replace(/^\//, '');

interface ParamRequestOpts {
  spaceId?: string;
  statusCode?: number;
}

/**
 * `POST /api/synthetics/params` — creates a global param. Mirrors the FTR
 * `SyntheticsParamsApiService.createParam`; the caller supplies the auth
 * headers (predefined-role or custom-role API key + internal origin).
 */
export async function createParam(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  param: ParamPayload,
  opts: ParamRequestOpts = {}
) {
  const { spaceId, statusCode = 200 } = opts;
  const res = await apiClient.post(paramsPath(spaceId), {
    headers,
    body: param,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

/** `GET /api/synthetics/params` — lists global params for the (optional) space. */
export async function getParams(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  opts: ParamRequestOpts = {}
) {
  const { spaceId, statusCode = 200 } = opts;
  const res = await apiClient.get(paramsPath(spaceId), { headers, responseType: 'json' });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

/** `GET /api/synthetics/params/{id}` — fetches a single global param. */
export async function getParam(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  paramId: string,
  opts: ParamRequestOpts = {}
) {
  const { spaceId, statusCode = 200 } = opts;
  const res = await apiClient.get(paramsPath(spaceId, `/${paramId}`), {
    headers,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

/** `PUT /api/synthetics/params/{id}` — updates a global param. */
export async function updateParam(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  paramId: string,
  param: Partial<ParamPayload>,
  opts: ParamRequestOpts = {}
) {
  const { spaceId, statusCode = 200 } = opts;
  const res = await apiClient.put(paramsPath(spaceId, `/${paramId}`), {
    headers,
    body: param,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

/** `DELETE /api/synthetics/params/{id}` — deletes a single global param. */
export async function deleteParam(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  paramId: string,
  opts: ParamRequestOpts = {}
) {
  const { spaceId, statusCode = 200 } = opts;
  const res = await apiClient.delete(paramsPath(spaceId, `/${paramId}`), {
    headers,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

/** `POST /api/synthetics/params/_bulk_delete` — bulk-deletes global params. */
export async function bulkDeleteParams(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  ids: string[],
  opts: ParamRequestOpts = {}
) {
  const { spaceId, statusCode = 200 } = opts;
  const res = await apiClient.post(paramsPath(spaceId, '/_bulk_delete'), {
    headers,
    body: { ids },
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(statusCode);
  return res;
}

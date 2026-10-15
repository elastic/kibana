/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout-oblt';
import { COMMON_HEADERS } from './constants';

const INVESTIGATIONS_PATH = 'internal/nightshift/investigations';

const spacePath = (path: string, spaceId?: string): string =>
  spaceId ? `s/${spaceId}/${path}` : path;

/** A per-run id so parallel/repeated Scout runs against a shared deployment cannot collide. */
export const uniqueId = (prefix: string): string => `${prefix}-${randomUUID()}`;

export interface InvestigationRequestOptions {
  spaceId?: string;
}

export const ensureInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  { spaceId }: InvestigationRequestOptions = {}
): Promise<ApiClientResponse> =>
  apiClient.post(spacePath(`${INVESTIGATIONS_PATH}/${id}/_ensure`, spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

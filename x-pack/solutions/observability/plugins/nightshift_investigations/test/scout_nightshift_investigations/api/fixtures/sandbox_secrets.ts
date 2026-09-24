/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import type { ApiClientFixture, ApiClientResponse, KibanaRole } from '@kbn/scout-oblt';
import { COMMON_HEADERS } from './constants';

const SANDBOX_SECRETS_PATH = 'internal/nightshift/sandbox_secrets';

export const NIGHTSHIFT_MANAGE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['all'] }, spaces: ['*'] }],
};

export const NIGHTSHIFT_READ_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { [NIGHTSHIFT_FEATURE_ID]: ['read'] }, spaces: ['*'] }],
};

const spacePath = (spaceId: string): string => `s/${spaceId}/${SANDBOX_SECRETS_PATH}`;

export const getSandboxSecrets = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  spaceId: string
): Promise<ApiClientResponse> =>
  apiClient.get(spacePath(spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

export const putSandboxSecrets = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  spaceId: string,
  body: { entries: Array<{ key: string; value?: string }>; version?: string }
): Promise<ApiClientResponse> =>
  apiClient.put(spacePath(spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

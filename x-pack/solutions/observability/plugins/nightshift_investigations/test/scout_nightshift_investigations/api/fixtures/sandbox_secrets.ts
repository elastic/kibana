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

// Can open Kibana and the space, but has no Nightshift feature privilege at all (not even read).
// The role API requires a non-empty `base` or `feature`, so grant an unrelated privilege.
export const NIGHTSHIFT_NO_ACCESS_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { advancedSettings: ['read'] }, spaces: ['*'] }],
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

/**
 * Replaces the space's secrets using the currently stored version. Once a space's secrets object
 * exists, every write must carry its version, so tests that only set up or clean up state use this.
 */
export const replaceSandboxSecrets = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  spaceId: string,
  entries: Array<{ key: string; value?: string }>
): Promise<ApiClientResponse> => {
  const { body } = await getSandboxSecrets(apiClient, cookieHeader, spaceId);
  return putSandboxSecrets(apiClient, cookieHeader, spaceId, { entries, version: body.version });
};

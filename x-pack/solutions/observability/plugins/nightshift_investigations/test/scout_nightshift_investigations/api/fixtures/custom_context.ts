/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout-oblt';
import { COMMON_HEADERS } from './constants';

const CUSTOM_CONTEXT_PATH = 'internal/nightshift/custom_context';

const spacePath = (spaceId: string): string => `s/${spaceId}/${CUSTOM_CONTEXT_PATH}`;

export const getCustomContext = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  spaceId: string
): Promise<ApiClientResponse> =>
  apiClient.get(spacePath(spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

export const putCustomContext = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  spaceId: string,
  body: { snippets: Array<{ id?: string; text: string }>; version?: string }
): Promise<ApiClientResponse> =>
  apiClient.put(spacePath(spaceId), {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

/** Replaces the space's snippets using the currently stored version. */
export const replaceCustomContext = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  spaceId: string,
  snippets: Array<{ id?: string; text: string }>
): Promise<ApiClientResponse> => {
  const { body } = await getCustomContext(apiClient, cookieHeader, spaceId);
  return putCustomContext(apiClient, cookieHeader, spaceId, { snippets, version: body.version });
};

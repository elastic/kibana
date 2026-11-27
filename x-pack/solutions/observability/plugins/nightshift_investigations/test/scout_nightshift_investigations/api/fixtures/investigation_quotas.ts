/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout-oblt';
import { COMMON_HEADERS } from './constants';

const INVESTIGATION_QUOTAS_PATH = 'internal/nightshift/investigation_quotas';

export const getInvestigationQuotas = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>
): Promise<ApiClientResponse> =>
  apiClient.get(INVESTIGATION_QUOTAS_PATH, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

export const putInvestigationQuotas = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  body: {
    enabled?: boolean;
    limits?: {
      automatic_investigation?: number | null;
      manual_investigation?: number | null;
      total_investigation?: number | null;
    };
  }
): Promise<ApiClientResponse> =>
  apiClient.put(INVESTIGATION_QUOTAS_PATH, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

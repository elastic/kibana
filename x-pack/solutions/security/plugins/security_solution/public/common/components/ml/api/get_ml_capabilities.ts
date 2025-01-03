/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { MlCapabilitiesResponse } from '@kbn/ml-plugin/public';
import type { InfluencerInput } from '../types';

export interface Body {
  jobIds: string[];
  criteriaFields: string[];
  influencers: InfluencerInput[];
  aggregationInterval: string;
  threshold: number;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  maxRecords: number;
  maxExamples: number;
}

export const getMlCapabilities = async ({
  http,
  signal,
}: {
  http: HttpSetup;
  signal: AbortSignal;
}): Promise<MlCapabilitiesResponse> =>
  http.fetch<MlCapabilitiesResponse>('/internal/ml/ml_capabilities', {
    method: 'GET',
    version: '1',
    asSystemRequest: true,
    signal,
  });

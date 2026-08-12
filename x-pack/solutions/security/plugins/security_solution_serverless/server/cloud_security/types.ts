/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSPM, KSPM, CNVM } from './constants';
import type { MeteringCallbackInput, Tier } from '../types';

export interface CloudDefendAssetCountAggregation {
  asset_count_groups: AssetCountAggregationBucket;
}
export interface AssetCountAggregationBucket {
  buckets: AssetCountAggregation[];
}

export interface ResourceSubtypeAggregationBucket {
  key: string;
  doc_count: number;
  unique_assets: {
    value: number;
  };
}

export interface AssetCountAggregation {
  key_as_string: string;
  min_timestamp: MinTimestamp;
  unique_assets: {
    value: number;
  };
  resource_sub_type: {
    buckets: ResourceSubtypeAggregationBucket[];
  };
  // SPIKE Option A: total corroborated witnessed running ms of gcp-compute-instance
  // resources in the sampling window.
  gcp_confirmed?: {
    total_confirmed_ms: {
      value: number | null;
    };
  };
}

export interface MinTimestamp {
  value: number;
  value_as_string: string;
}

export type CloudSecuritySolutions = typeof CSPM | typeof KSPM | typeof CNVM;

export interface CloudSecurityMeteringCallbackInput
  extends Omit<MeteringCallbackInput, 'cloudSetup' | 'signal' | 'config'> {
  projectId: string;
  cloudSecuritySolution: CloudSecuritySolutions;
  tier: Tier;
}

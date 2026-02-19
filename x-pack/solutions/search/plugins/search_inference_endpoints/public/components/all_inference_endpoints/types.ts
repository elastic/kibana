/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

export const INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES = [25, 50, 100];

export interface FilterOptions {
  provider: ServiceProviderKeys[];
  type: InferenceTaskType[];
}

export interface InferenceUsageInfo {
  id: string;
  type: string;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type {
  InferenceInferenceEndpointInfo,
  InferenceTaskType,
} from '@elastic/elasticsearch/lib/api/types';

export const INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES = [25, 50, 100];

// Extended type that includes 'model' as a sortable field
// 'model' is a virtual field extracted from service_settings via getModelId()
export interface SortableInferenceEndpoint extends InferenceInferenceEndpointInfo {
  model?: string;
}

// Sort fields are derived from SortableInferenceEndpoint to ensure type safety
export type SortFieldInferenceEndpoint = 'inference_id' | 'service' | 'task_type' | 'model';

export const SortFieldInferenceEndpoint = {
  inference_id: 'inference_id',
  service: 'service',
  task_type: 'task_type',
  model: 'model',
} as const;

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export interface SortingParams {
  sortField: SortFieldInferenceEndpoint;
  sortOrder: SortOrder;
}

export interface QueryParams extends SortingParams {
  page: number;
  perPage: number;
}

export interface FilterOptions {
  provider: ServiceProviderKeys[];
  type: InferenceTaskType[];
}

export interface AllInferenceEndpointsTableState {
  filterOptions: FilterOptions;
  queryParams: QueryParams;
}

export interface EuiBasicTableSortTypes {
  direction: SortOrder;
  field: string;
}

export interface InferenceUsageInfo {
  id: string;
  type: string;
}

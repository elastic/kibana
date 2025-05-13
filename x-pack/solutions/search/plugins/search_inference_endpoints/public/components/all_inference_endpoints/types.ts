/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

export const INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES = [25, 50, 100];

export enum SortFieldInferenceEndpoint {
  inference_id = 'inference_id',
}
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

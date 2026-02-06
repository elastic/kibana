/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GroupByOptions,
  SortFieldInferenceEndpoint,
  SortOrder,
  type QueryParams,
  type FilterOptions,
} from '../../types';
import type { AllInferenceEndpointsTableState } from './types';

export const DEFAULT_TABLE_ACTIVE_PAGE = 1;
export const DEFAULT_TABLE_LIMIT = 25;

export const DEFAULT_QUERY_PARAMS: QueryParams = {
  page: DEFAULT_TABLE_ACTIVE_PAGE,
  perPage: DEFAULT_TABLE_LIMIT,
  sortField: SortFieldInferenceEndpoint.inference_id,
  sortOrder: SortOrder.asc,
  groupBy: GroupByOptions.None,
};

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  provider: [],
  type: [],
};

export const PIPELINE_URL = 'ingest/ingest_pipelines';
export const SERVERLESS_INDEX_MANAGEMENT_URL = 'index_details';

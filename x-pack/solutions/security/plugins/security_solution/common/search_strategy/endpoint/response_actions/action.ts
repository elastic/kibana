/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type {
  SortOrder,
  Inspect,
  Maybe,
  RequestBasicOptions,
  ResponseActionsSearchHit,
} from './types';

export interface ActionRequestOptions extends RequestBasicOptions {
  alertIds: string[];
  agentId?: string;
  sort: {
    order: SortOrder;
    field: string;
  };
}

export interface ActionRequestStrategyResponse extends IEsSearchResponse {
  edges: ResponseActionsSearchHit[];
  inspect?: Maybe<Inspect>;
}

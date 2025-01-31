/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchResponse, ESSearchRequest } from '@kbn/es-types';
import { createAsyncAction } from '../utils/actions';

export interface EsActionPayload {
  params: ESSearchRequest;
  name: string;
}

export interface EsActionResponse {
  name: string;
  result: ESSearchResponse;
}

export const executeEsQueryAction = createAsyncAction<EsActionPayload, EsActionResponse>(
  'executeEsQueryAction'
);

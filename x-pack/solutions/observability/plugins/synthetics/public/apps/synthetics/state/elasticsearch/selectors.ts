/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsAppState } from '../root_reducer';

export const selectEsQueryLoading = (queryState: SyntheticsAppState) =>
  queryState.elasticsearch.loading;

export const selectEsQueryResult = (queryState: SyntheticsAppState) =>
  queryState.elasticsearch.results;

export const selectEsQueryError = (queryState: SyntheticsAppState) =>
  queryState.elasticsearch.error;

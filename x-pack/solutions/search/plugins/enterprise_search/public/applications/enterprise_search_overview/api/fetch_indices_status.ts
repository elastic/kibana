/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesStatusResponse } from '@kbn/search-indices/common';

import { createApiLogic } from '../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../shared/http';

export type FetchIndicesStatusApiLogicResponse = IndicesStatusResponse;

export const fetchIndicesStatus = async () => {
  const { http } = HttpLogic.values;
  const route = '/internal/search_indices/status';
  const response = await http.get<FetchIndicesStatusApiLogicResponse>(route);

  return response;
};

export const FetchIndicesStatusAPILogic = createApiLogic(
  ['overview', 'api_indices_status_api_logic'],
  fetchIndicesStatus
);

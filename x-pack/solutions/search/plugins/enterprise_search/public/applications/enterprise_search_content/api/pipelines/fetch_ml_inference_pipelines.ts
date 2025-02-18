/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlInferencePipeline } from '../../../../../common/types/pipelines';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type FetchMlInferencePipelinesArgs = undefined;
export type FetchMlInferencePipelinesResponse = Record<string, MlInferencePipeline | undefined>;

export const fetchMlInferencePipelines = async () => {
  const route = '/internal/enterprise_search/pipelines/ml_inference';

  return await HttpLogic.values.http.get<FetchMlInferencePipelinesResponse>(route);
};

export const FetchMlInferencePipelinesApiLogic = createApiLogic(
  ['fetch_ml_inference_pipelines_api_logic'],
  fetchMlInferencePipelines
);

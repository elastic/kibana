/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlInferenceHistoryResponse } from '../../../../../common/types/pipelines';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchMlInferencePipelineHistoryApiLogicArgs {
  indexName: string;
}
export type FetchMlInferencePipelineHistoryApiLogicResponse = MlInferenceHistoryResponse;

export const fetchMlInferencePipelineHistory = async ({
  indexName,
}: FetchMlInferencePipelineHistoryApiLogicArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/ml_inference/history`;

  return await HttpLogic.values.http.get<FetchMlInferencePipelineHistoryApiLogicResponse>(route);
};

export const FetchMlInferencePipelineHistoryApiLogic = createApiLogic(
  ['fetch_ml_inference_pipeline_history_api_logic'],
  fetchMlInferencePipelineHistory
);

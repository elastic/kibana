/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlInferenceError } from '../../../../../common/types/pipelines';
import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchMlInferenceErrorsApiLogicArgs {
  indexName: string;
}
export interface FetchMlInferenceErrorsApiLogicResponse {
  errors: MlInferenceError[];
}

export const fetchMlInferenceErrors = async ({ indexName }: FetchMlInferenceErrorsApiLogicArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/ml_inference/errors`;

  return await HttpLogic.values.http.get<FetchMlInferenceErrorsApiLogicResponse>(route);
};

export const FetchMlInferenceErrorsApiLogic = createApiLogic(
  ['fetch_ml_inference_errors_api_logic'],
  fetchMlInferenceErrors
);

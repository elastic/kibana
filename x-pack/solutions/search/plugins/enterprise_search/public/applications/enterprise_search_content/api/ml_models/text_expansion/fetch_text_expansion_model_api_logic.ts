/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Actions, createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export interface FetchTextExpansionModelArgs {
  modelId: string;
}

export interface FetchTextExpansionModelResponse {
  deploymentState: string;
  modelId: string;
  targetAllocationCount: number;
  nodeAllocationCount: number;
  threadsPerAllocation: number;
}

export const fetchTextExpansionModelStatus = async ({ modelId }: FetchTextExpansionModelArgs) => {
  return await HttpLogic.values.http.get<FetchTextExpansionModelResponse>(
    `/internal/enterprise_search/ml/models/${modelId}`
  );
};

export const FetchTextExpansionModelApiLogic = createApiLogic(
  ['fetch_text_expansion_model_api_logic'],
  fetchTextExpansionModelStatus,
  { showErrorFlash: false }
);

export type FetchTextExpansionModelApiLogicActions = Actions<
  FetchTextExpansionModelArgs,
  FetchTextExpansionModelResponse
>;

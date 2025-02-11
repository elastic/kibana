/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface StartModelArgs {
  modelId: string;
}

export interface StartModelResponse {
  deploymentState: string;
  modelId: string;
}

export const startModel = async ({ modelId }: StartModelArgs): Promise<StartModelResponse> => {
  const route = `/internal/enterprise_search/ml/models/${modelId}/deploy`;
  return await HttpLogic.values.http.post<StartModelResponse>(route);
};

export const StartModelApiLogic = createApiLogic(['start_model_api_logic'], startModel, {
  showErrorFlash: false,
});

export type StartModelApiLogicActions = Actions<StartModelArgs, StartModelResponse>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface CreateModelArgs {
  modelId: string;
}

export interface CreateModelResponse {
  deploymentState: string;
  modelId: string;
}

export const createModel = async ({ modelId }: CreateModelArgs): Promise<CreateModelResponse> => {
  const route = `/internal/enterprise_search/ml/models/${modelId}`;
  return await HttpLogic.values.http.post<CreateModelResponse>(route);
};

export const CreateModelApiLogic = createApiLogic(['create_model_api_logic'], createModel, {
  showErrorFlash: false,
});

export type CreateModelApiLogicActions = Actions<CreateModelArgs, CreateModelResponse>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlModel } from '../../../../../common/types/ml';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export type FetchModelsApiResponse = MlModel[];

export const fetchModels = async () => {
  const route = '/internal/enterprise_search/ml/models';
  return await HttpLogic.values.http.get<FetchModelsApiResponse>(route);
};

export const FetchModelsApiLogic = createApiLogic(['fetch_models_api_logic'], fetchModels, {
  showErrorFlash: false,
});

export type FetchModelsApiLogicActions = Actions<{}, FetchModelsApiResponse>;

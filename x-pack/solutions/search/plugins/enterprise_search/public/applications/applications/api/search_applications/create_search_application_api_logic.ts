/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchApplicationUpsertResponse } from '../../../../../common/types/search_applications';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface CreateSearchApplicationApiParams {
  indices: string[];
  name: string;
}

export type CreateSearchApplicationApiResponse = EnterpriseSearchApplicationUpsertResponse;

export type CreateSearchApplicationApiLogicActions = Actions<
  CreateSearchApplicationApiParams,
  CreateSearchApplicationApiResponse
>;

export const createSearchApplication = async ({
  name,
  indices,
}: CreateSearchApplicationApiParams): Promise<CreateSearchApplicationApiResponse> => {
  const route = `/internal/enterprise_search/search_applications/${name}`;

  return await HttpLogic.values.http.put<EnterpriseSearchApplicationUpsertResponse>(route, {
    body: JSON.stringify({ indices, name }),
    query: { create: true },
  });
};

export const CreateSearchApplicationApiLogic = createApiLogic(
  ['search_applications', 'create_search_application_api_logic'],
  createSearchApplication,
  {
    showErrorFlash: false,
  }
);

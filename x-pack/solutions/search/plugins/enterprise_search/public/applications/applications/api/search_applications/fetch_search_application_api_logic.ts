/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchApplicationDetails } from '../../../../../common/types/search_applications';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchSearchApplicationApiParams {
  name: string;
}

export type FetchSearchApplicationApiResponse = EnterpriseSearchApplicationDetails;

export const fetchSearchApplication = async ({
  name,
}: FetchSearchApplicationApiParams): Promise<FetchSearchApplicationApiResponse> => {
  const route = `/internal/enterprise_search/search_applications/${name}`;

  return await HttpLogic.values.http.get<EnterpriseSearchApplicationDetails>(route);
};

export const FetchSearchApplicationApiLogic = createApiLogic(
  ['search_applications', 'fetch_search_application_api_logic'],
  fetchSearchApplication
);

export type FetchSearchApplicationApiLogicActions = Actions<
  FetchSearchApplicationApiParams,
  FetchSearchApplicationApiResponse
>;

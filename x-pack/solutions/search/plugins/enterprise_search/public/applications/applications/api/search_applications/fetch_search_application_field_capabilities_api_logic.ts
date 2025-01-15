/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnterpriseSearchApplicationFieldCapabilities } from '../../../../../common/types/search_applications';
import { Actions, createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface FetchSearchApplicationFieldCapabilitiesApiParams {
  name: string;
}

export type FetchSearchApplicationFieldCapabilitiesApiResponse =
  EnterpriseSearchApplicationFieldCapabilities;

export const fetchSearchApplicationFieldCapabilities = async ({
  name,
}: FetchSearchApplicationFieldCapabilitiesApiParams): Promise<FetchSearchApplicationFieldCapabilitiesApiResponse> => {
  const route = `/internal/enterprise_search/search_applications/${name}/field_capabilities`;

  return await HttpLogic.values.http.get<EnterpriseSearchApplicationFieldCapabilities>(route);
};

export const FetchSearchApplicationFieldCapabilitiesApiLogic = createApiLogic(
  ['search_applications', 'fetch_search_application_field_capabilities_api_logic'],
  fetchSearchApplicationFieldCapabilities
);

export type FetchSearchApplicationFieldCapabilitiesApiLogicActions = Actions<
  FetchSearchApplicationFieldCapabilitiesApiParams,
  FetchSearchApplicationFieldCapabilitiesApiResponse
>;

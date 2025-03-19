/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiKey } from '@kbn/security-plugin-types-common';

import { createApiLogic } from '../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../shared/http';

export interface FetchApiKeysApiLogicResponse {
  api_keys: ApiKey[];
}

export const fetchApiKeys = async () => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/api_keys';
  const response = await http.get<FetchApiKeysApiLogicResponse>(route);

  return response;
};

export const FetchApiKeysAPILogic = createApiLogic(
  ['overview', 'api_keys_api_logic'],
  fetchApiKeys
);

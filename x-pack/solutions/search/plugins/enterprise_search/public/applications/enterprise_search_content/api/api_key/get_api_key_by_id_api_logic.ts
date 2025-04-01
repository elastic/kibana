/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';
import { APIKeyResponse } from '../generate_api_key/generate_api_key_logic';

export const getApiKeyById = async (id: string) => {
  const route = `/internal/enterprise_search/api_keys/${id}`;

  return await HttpLogic.values.http.get<APIKeyResponse>(route);
};

export const GetApiKeyByIdLogic = createApiLogic(['get_api_key_by_id_logic'], getApiKeyById);

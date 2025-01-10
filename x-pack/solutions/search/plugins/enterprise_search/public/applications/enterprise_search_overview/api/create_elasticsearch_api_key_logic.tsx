/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../shared/http';

export interface CreateApiKeyResponse {
  api_key: string;
  beats_logstash_format: string;
  encoded?: string;
  expiration?: number;
  id: string;
  name: string;
}

export interface CreateAPIKeyArgs {
  expiration?: string;
  metadata?: Record<string, unknown>;
  name: string;
  role_descriptors?: Record<string, unknown>;
}

export const createApiKey = async (args: CreateAPIKeyArgs) => {
  const { http } = HttpLogic.values;
  const route = '/internal/enterprise_search/api_keys';
  const response = await http.post<CreateApiKeyResponse>(route, { body: JSON.stringify(args) });

  return response;
};

export const CreateApiKeyAPILogic = createApiLogic(
  ['overview', 'create_api_key_api_logic'],
  createApiKey
);

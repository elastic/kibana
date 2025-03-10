/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum APIRoutes {
  API_KEYS = '/internal/search_api_keys',
  API_KEY_VALIDITY = '/internal/search_api_keys/validity',
}

export interface APIKey {
  id: string;
  name: string;
  expiration?: number;
  invalidated?: boolean;
}

export interface APIKeyCreationResponse extends Pick<APIKey, 'id' | 'name' | 'expiration'> {
  api_key: string;
  encoded: string;
}

export type GetApiKeyResponse = APIKey;

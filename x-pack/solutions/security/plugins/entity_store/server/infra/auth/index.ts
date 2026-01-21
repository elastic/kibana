/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getApiKeyManager, type ApiKeyManager, type EntityStoreAPIKey } from './api_key';
export {
  EntityStoreApiKeyType,
  SO_ENTITY_STORE_API_KEY_TYPE,
  EntityStoreApiKeyEncryptedTypeRegistration,
} from './saved_object';

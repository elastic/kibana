/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

export const SO_ENTITY_STORE_API_KEY_TYPE = 'entity-store-api-key';

const savedObjectSchema = schema.object({
  apiKey: schema.string(),
  type: schema.string(),
  namespace: schema.string(),
  id: schema.string(),
  name: schema.string(),
});

export const EntityStoreApiKeyType: SavedObjectsType = {
  name: SO_ENTITY_STORE_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: { type: 'binary' },
      type: { type: 'keyword' },
      namespace: { type: 'keyword' },
      id: { type: 'keyword' },
      name: { type: 'keyword' },
    },
  },
  management: {
    importableAndExportable: false,
    displayName: 'Entity Store API key',
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: savedObjectSchema.extends({}, { unknowns: 'allow' }),
        create: savedObjectSchema,
      },
    },
  },
};

export const EntityStoreApiKeyEncryptedTypeRegistration: EncryptedSavedObjectTypeRegistration = {
  type: SO_ENTITY_STORE_API_KEY_TYPE,
  attributesToEncrypt: new Set(['apiKey']),
  attributesToIncludeInAAD: new Set(['type', 'namespace']),
  enforceRandomId: false,
};

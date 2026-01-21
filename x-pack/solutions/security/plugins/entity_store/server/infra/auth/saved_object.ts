/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

export const SO_ENTITY_STORE_API_KEY_TYPE = 'entity-store-api-key';

export const EntityStoreApiKeyType: SavedObjectsType = {
  name: SO_ENTITY_STORE_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: { type: 'binary' },
    },
  },
  management: {
    importableAndExportable: false,
    displayName: 'Entity Store API key',
  },
};

export const EntityStoreApiKeyEncryptedTypeRegistration: EncryptedSavedObjectTypeRegistration = {
  type: SO_ENTITY_STORE_API_KEY_TYPE,
  attributesToEncrypt: new Set(['apiKey']),
  attributesToIncludeInAAD: new Set(['id', 'name']),
  enforceRandomId: false,
};

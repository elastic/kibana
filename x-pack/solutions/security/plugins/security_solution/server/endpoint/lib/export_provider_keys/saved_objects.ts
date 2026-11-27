/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';
import { EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE } from './constants';

const exportProviderKeyAttributesSchemaV1 = schema.object({
  package_policy_id: schema.string(),
  type: schema.literal('account_key'),
  account_name: schema.string(),
  account_key: schema.string(),
  created_at: schema.string(),
});

export const exportProviderKeySavedObjectType: SavedObjectsType = {
  name: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'agnostic',
  management: { importableAndExportable: false },
  mappings: {
    dynamic: false,
    properties: {
      package_policy_id: { type: 'keyword', ignore_above: 1024 },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: exportProviderKeyAttributesSchemaV1.extends(
          {},
          { unknowns: 'ignore' }
        ),
        create: exportProviderKeyAttributesSchemaV1,
      },
    },
  },
};

/**
 * `account_name` is in the AAD from the start: adding an existing attribute to the AAD later isn't
 * supported on serverless.
 */
export const exportProviderKeyEncryptionParams: EncryptedSavedObjectTypeRegistration = {
  type: EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE,
  attributesToEncrypt: new Set(['account_key']),
  attributesToIncludeInAAD: new Set(['package_policy_id', 'type', 'account_name']),
};

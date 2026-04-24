/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import type { EncryptedSavedObjectTypeRegistration } from '@kbn/encrypted-saved-objects-plugin/server';

export const BILLING_API_KEY_TYPE = 'search-homepage-billing-api-key';
export const BILLING_API_KEY_ID = 'billing-api-key-singleton';

const billingApiKeySchema = schema.object({
  apiKey: schema.string(),
  organizationId: schema.maybe(schema.string()),
  budgetEcu: schema.maybe(schema.number()),
  createdAt: schema.maybe(schema.string()),
  updatedAt: schema.maybe(schema.string()),
});

export interface BillingApiKeyAttributes {
  apiKey: string;
  organizationId?: string;
  budgetEcu?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const BillingApiKeyType: SavedObjectsType = {
  name: BILLING_API_KEY_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      apiKey: {
        type: 'binary',
      },
      organizationId: {
        type: 'keyword',
      },
      budgetEcu: {
        type: 'float',
      },
      createdAt: {
        type: 'date',
      },
      updatedAt: {
        type: 'date',
      },
    },
  },
  management: {
    importableAndExportable: false,
    displayName: 'Billing API Key',
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: billingApiKeySchema.extends({}, { unknowns: 'ignore' }),
        create: billingApiKeySchema,
      },
    },
  },
};

export const BillingApiKeyEncryptionParams: EncryptedSavedObjectTypeRegistration = {
  type: BILLING_API_KEY_TYPE,
  attributesToEncrypt: new Set(['apiKey']),
  attributesToIncludeInAAD: new Set(['organizationId']),
};

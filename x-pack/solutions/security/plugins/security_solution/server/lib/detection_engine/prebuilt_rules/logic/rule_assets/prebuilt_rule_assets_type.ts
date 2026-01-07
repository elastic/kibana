/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const PREBUILT_RULE_ASSETS_SO_TYPE = 'security-rule';

const prebuiltRuleAssetMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    rule_id: {
      type: 'keyword',
    },
    version: {
      type: 'long',
    },
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          normalizer: 'lowercase',
        },
      },
    },
    tags: {
      type: 'keyword',
    },
    severity: {
      type: 'keyword',
    },
    risk_score: {
      type: 'float',
    },
  },
};

export const prebuiltRuleAssetType: SavedObjectsType = {
  name: PREBUILT_RULE_ASSETS_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: false,
  },
  namespaceType: 'agnostic',
  mappings: prebuiltRuleAssetMappings,
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: schema.object({}, { unknowns: 'allow' }),
        create: schema.object({}, { unknowns: 'allow' }),
      },
    },
    '2': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  normalizer: 'lowercase',
                },
              },
            },
            tags: {
              type: 'keyword',
            },
            severity: {
              type: 'keyword',
            },
            risk_score: {
              type: 'float',
            },
          },
        },
      ],
      schemas: {
        forwardCompatibility: schema.object({}, { unknowns: 'allow' }),
        create: schema.object({}, { unknowns: 'allow' }),
      },
    },
  },
};

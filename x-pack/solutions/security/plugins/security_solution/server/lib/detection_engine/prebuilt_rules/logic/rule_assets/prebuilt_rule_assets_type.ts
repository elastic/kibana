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

/**
 * Upper bound for the number of tags per prebuilt rule asset.
 * In practice, prebuilt rule assets typically have fewer than 15 tags.
 * This limit exists to satisfy the "unbounded-array-in-schema" CodeQL check.
 * See: https://github.com/elastic/kibana/security/code-scanning/2072
 */
const MAX_TAGS_PER_RULE = 100;

const securityRuleV1 = schema.object(
  {
    rule_id: schema.string(),
    version: schema.number(),
  },
  { unknowns: 'allow' }
);

const securityRuleV2 = securityRuleV1.extends(
  {
    name: schema.string(),
    tags: schema.maybe(schema.arrayOf(schema.string(), { maxSize: MAX_TAGS_PER_RULE })),
    severity: schema.string(),
    risk_score: schema.number(),
  },
  { unknowns: 'allow' }
);

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
        forwardCompatibility: securityRuleV1,
        create: securityRuleV1,
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
        forwardCompatibility: securityRuleV2,
        create: securityRuleV2,
      },
    },
  },
};

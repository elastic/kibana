/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { getModifiedValue } from '@kbn/alerting-plugin/server/rules_client/common';

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
    mapped_params: {
      properties: {
        severity: {
          type: 'keyword',
        },
      },
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
    },
    '2': {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: {
            mapped_params: {
              properties: {
                severity: {
                  type: 'keyword',
                },
              },
            },
          },
        },
        {
          type: 'data_backfill',
          backfillFn: (prevAttributes, context) => {
            // NOTE: Adds a new field field to the doc, which isn't ideal
            const mappedSeverity = getModifiedValue('severity', prevAttributes.attributes.severity);
            return {
              attributes: {
                mapped_params: {
                  severity: mappedSeverity,
                },
              },
            };
          },
        },
      ],
    },
  },
};

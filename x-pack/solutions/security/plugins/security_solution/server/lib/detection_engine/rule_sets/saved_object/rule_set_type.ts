/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const RULE_SET_SO_TYPE = 'security-rule-set';

/** Same values as the rule set API. Rules are referenced by `rule_id`, which survives import. */
export interface RuleSetAttributes {
  name: string;
  description?: string;
  visibility: 'space' | 'private';
  conditions: {
    tags?: string[];
    integrations?: string[];
    rule_types?: string[];
    severities?: string[];
    source?: 'elastic' | 'custom';
    search?: string;
  };
  included_rule_ids: string[];
  excluded_rule_ids: string[];
}

const MAX_RULE_IDS = 10_000;

const ruleSetSchemaV1 = schema.object({
  name: schema.string({ minLength: 1, maxLength: 256 }),
  description: schema.maybe(schema.string({ maxLength: 2048 })),
  visibility: schema.oneOf([schema.literal('space'), schema.literal('private')]),
  conditions: schema.object({
    tags: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
    integrations: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
    rule_types: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 20 })),
    severities: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 4 })),
    source: schema.maybe(schema.oneOf([schema.literal('elastic'), schema.literal('custom')])),
    search: schema.maybe(schema.string({ maxLength: 256 })),
  }),
  included_rule_ids: schema.arrayOf(schema.string(), { maxSize: MAX_RULE_IDS }),
  excluded_rule_ids: schema.arrayOf(schema.string(), { maxSize: MAX_RULE_IDS }),
});

const ruleSetModelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: ruleSetSchemaV1.extends({}, { unknowns: 'ignore' }),
    create: ruleSetSchemaV1,
  },
};

export const ruleSetType: SavedObjectsType = {
  name: RULE_SET_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  // Only the rule set routes read and write groups. They check the owner of private groups.
  hiddenFromHttpApis: true,
  namespaceType: 'multiple-isolated',
  management: { importableAndExportable: false },
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
      visibility: { type: 'keyword', ignore_above: 16 },
    },
  },
  modelVersions: {
    1: ruleSetModelVersion1,
  },
};

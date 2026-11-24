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
import type { RuleSetConditions } from '../../../../../common/api/detection_engine/rule_sets';

export const RULE_SET_SO_TYPE = 'security-rule-set';

/** Same values as the rule set API. Rules are referenced by `rule_id`, which survives import. */
export interface RuleSetAttributes {
  name: string;
  description?: string;
  visibility: 'space' | 'private';
  conditions: RuleSetConditions;
  included_rule_ids: string[];
  excluded_rule_ids: string[];
}

const MAX_RULE_IDS = 10_000;
const MAX_VALUES = 100;

const value = schema.string({ minLength: 1, maxLength: 1024 });
const ruleId = schema.string({ minLength: 1, maxLength: 256 });
const literals = <T extends string>(values: readonly T[]) =>
  schema.oneOf(values.map((v) => schema.literal(v)) as [ReturnType<typeof schema.literal<T>>]);

const ruleTypes = [
  'query',
  'saved_query',
  'eql',
  'esql',
  'threshold',
  'threat_match',
  'machine_learning',
  'new_terms',
] as const;
const severities = ['low', 'medium', 'high', 'critical'] as const;

const valuesSchema = schema.object({
  include: schema.maybe(schema.arrayOf(value, { maxSize: MAX_VALUES })),
  exclude: schema.maybe(schema.arrayOf(value, { maxSize: MAX_VALUES })),
  match: schema.oneOf([schema.literal('all'), schema.literal('any')]),
});

const enumValuesSchema = <T extends string>(values: readonly T[]) =>
  schema.object({
    include: schema.maybe(schema.arrayOf(literals(values), { maxSize: values.length })),
    exclude: schema.maybe(schema.arrayOf(literals(values), { maxSize: values.length })),
  });

const ruleSetSchemaV1 = schema.object({
  name: schema.string({ minLength: 1, maxLength: 256 }),
  description: schema.maybe(schema.string({ maxLength: 2048 })),
  visibility: schema.oneOf([schema.literal('space'), schema.literal('private')]),
  // The stored form always has `match`: see normalizeRuleSetConditions.
  conditions: schema.object({
    tags: schema.maybe(valuesSchema),
    related_integrations: schema.maybe(valuesSchema),
    type: schema.maybe(enumValuesSchema(ruleTypes)),
    severity: schema.maybe(enumValuesSchema(severities)),
    rule_source: schema.maybe(
      schema.object({
        include: schema.arrayOf(literals(['external', 'internal'] as const), {
          minSize: 1,
          maxSize: 1,
        }),
      })
    ),
    mitre_tactic: schema.maybe(valuesSchema),
    tag_categories: schema.maybe(
      schema.recordOf(schema.string({ minLength: 1, maxLength: 256 }), valuesSchema)
    ),
    search: schema.maybe(
      schema.object({
        term: schema.string({ minLength: 1, maxLength: 256 }),
        mode: schema.literal('legacy'),
      })
    ),
  }),
  included_rule_ids: schema.arrayOf(ruleId, { maxSize: MAX_RULE_IDS }),
  excluded_rule_ids: schema.arrayOf(ruleId, { maxSize: MAX_RULE_IDS }),
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
  // Only the rule set routes read and write sets. They check the owner of private sets.
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

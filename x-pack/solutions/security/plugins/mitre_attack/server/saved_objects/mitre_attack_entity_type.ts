/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';

export const MITRE_ATTACK_ENTITY_SO_TYPE = 'mitre-attack-entity';

const mitreAttackEntityAttributesSchemaV1 = schema.object({
  framework: schema.string(),
  framework_version: schema.string(),
  id: schema.string(),
  name: schema.string(),
  reference: schema.string(),
  description: schema.string(),
  revoked: schema.boolean(),
  deprecated: schema.boolean(),
  type: schema.oneOf([
    schema.literal('tactic'),
    schema.literal('technique'),
    schema.literal('subtechnique'),
  ]),
  superseded_by_id: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10 })),
  position: schema.maybe(schema.number()),
  tactic_ids: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 20 })),
  technique_id: schema.maybe(schema.string()),
});

export const mitreAttackEntityType: SavedObjectsType = {
  name: MITRE_ATTACK_ENTITY_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  namespaceType: 'agnostic',
  hidden: true,
  // `dynamic: false` is deliberate. Indexed fields below are the ones we query,
  // sort, or aggregate on. `reference` and `superseded_by_id` are intentionally
  // left unindexed: they are display-only values that are still stored in `_source`
  // and returned by reads, they just cannot be filtered or sorted on in ES.
  mappings: {
    dynamic: false,
    properties: {
      framework: { type: 'keyword' },
      framework_version: { type: 'version' },
      id: { type: 'keyword' },
      type: { type: 'keyword' },
      name: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      description: { type: 'text' },
      revoked: { type: 'boolean' },
      deprecated: { type: 'boolean' },
      position: { type: 'integer' },
      tactic_ids: { type: 'keyword' },
      technique_id: { type: 'keyword' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: mitreAttackEntityAttributesSchemaV1.extends(
          {},
          { unknowns: 'ignore' }
        ),
        create: mitreAttackEntityAttributesSchemaV1,
      },
    },
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { MITRE_ATTACK_ENTITY_SO_TYPE, MITRE_INFERENCE_ID } from '../../common/constants';

const mitreAttackEntityAttributesSchemaV1 = schema.object({
  framework: schema.string(),
  framework_version: schema.string(),
  id: schema.string(),
  type: schema.string(),
  name: schema.string(),
  reference: schema.string(),
  description: schema.string(),
  revoked: schema.boolean(),
  superseded_by_id: schema.maybe(schema.arrayOf(schema.string())),
  deprecated: schema.boolean(),
  tactic_ids: schema.maybe(schema.arrayOf(schema.string())),
  technique_id: schema.maybe(schema.string()),
  position: schema.maybe(schema.number()),
  semantic_content: schema.maybe(schema.string()),
});

export const mitreAttackEntitySavedObjectType: SavedObjectsType = {
  name: MITRE_ATTACK_ENTITY_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      framework: { type: 'keyword' },
      framework_version: { type: 'keyword' },
      id: { type: 'keyword' },
      type: { type: 'keyword' },
      name: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      reference: { type: 'keyword' },
      description: { type: 'text' },
      tactic_ids: { type: 'keyword' },
      technique_id: { type: 'keyword' },
      revoked: { type: 'boolean' },
      deprecated: { type: 'boolean' },
      position: { type: 'integer' },
      superseded_by_id: { type: 'keyword' },
      semantic_content: {
        type: 'semantic_text',
        inference_id: MITRE_INFERENCE_ID,
      },
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

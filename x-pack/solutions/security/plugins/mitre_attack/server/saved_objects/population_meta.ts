/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import { MITRE_ATTACK_POPULATION_META_SO_TYPE } from '../../common/constants';

const populationMetaAttributesSchemaV1 = schema.object({
  artifactVersion: schema.string(),
  artifactHash: schema.string(),
});

export const mitreAttackPopulationMetaSavedObjectType: SavedObjectsType = {
  name: MITRE_ATTACK_POPULATION_META_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {
      artifactVersion: { type: 'keyword' },
      artifactHash: { type: 'keyword' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: populationMetaAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: populationMetaAttributesSchemaV1,
      },
    },
  },
};

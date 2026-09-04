/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { ENTITY_DEFINITION_SO_TYPE } from '../../common/constants';
import { entityDefinitionAttributesSchema } from '../../common/entity_definition';

export const entityDefinitionSavedObjectType: SavedObjectsType = {
  name: ENTITY_DEFINITION_SO_TYPE,
  hidden: true,
  hiddenFromHttpApis: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: { type: 'keyword' },
      type: { type: 'keyword' },
      identityFields: { type: 'keyword' },
      indexPattern: { type: 'keyword' },
      lookbackPeriod: { type: 'keyword' },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        create: entityDefinitionAttributesSchema,
        forwardCompatibility: entityDefinitionAttributesSchema.extends({}, { unknowns: 'ignore' }),
      },
    },
  },
};

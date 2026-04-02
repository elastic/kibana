/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const watchlistConfigTypeName = 'watchlist-config';

export const watchlistConfigTypeNameMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    name: {
      type: 'keyword',
    },
    description: {
      type: 'text',
    },
    riskModifier: {
      type: 'float',
    },
    managed: {
      type: 'boolean',
    },
  },
};

const watchlistConfigSchemaV1 = schema.object({
  name: schema.string(),
  description: schema.maybe(schema.string()),
  riskModifier: schema.number(),
  managed: schema.boolean(),
});

const watchlistModelVersion1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: watchlistConfigSchemaV1.extends({}, { unknowns: 'ignore' }),
    create: watchlistConfigSchemaV1,
  },
};

export const watchlistConfigType: SavedObjectsType = {
  name: watchlistConfigTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: watchlistConfigTypeNameMappings,
  modelVersions: {
    1: watchlistModelVersion1,
  },
};

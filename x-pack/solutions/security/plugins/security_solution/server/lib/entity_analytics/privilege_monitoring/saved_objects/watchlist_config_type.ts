/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

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

export const watchlistConfigType: SavedObjectsType = {
  name: watchlistConfigTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: watchlistConfigTypeNameMappings,
  modelVersions: {},
};

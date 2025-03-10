/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const signalsMigrationType = 'security-solution-signals-migration';

export const signalsMigrationMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    sourceIndex: {
      type: 'keyword',
    },
    updated: {
      type: 'date',
    },
    version: {
      type: 'long',
    },
  },
};

export const type: SavedObjectsType = {
  name: signalsMigrationType,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'single',
  mappings: signalsMigrationMappings,
};

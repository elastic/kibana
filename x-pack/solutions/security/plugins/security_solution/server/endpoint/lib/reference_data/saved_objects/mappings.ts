/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { REFERENCE_DATA_SAVED_OBJECT_TYPE } from '../constants';

export const referenceDataSavedObjectType: SavedObjectsType = {
  name: REFERENCE_DATA_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  namespaceType: 'agnostic',
  hidden: true,
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      type: { type: 'keyword' },
      owner: { type: 'keyword' },
      metadata: { type: 'object' },
    },
  },
};

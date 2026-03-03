/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { SEARCH_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { PLAYGROUND_SAVED_OBJECT_TYPE } from '../../common';
import { playgroundAttributesSchema as playgroundAttributesSchemaV1 } from './schema/v1/v1';
import {
  playgroundAttributesSchemaV2,
  transformV1ToV2,
  type SavedPlaygroundV2,
} from './schema/v2/v2';

export const createPlaygroundSavedObjectType = (): SavedObjectsType<SavedPlaygroundV2> => ({
  name: PLAYGROUND_SAVED_OBJECT_TYPE,
  indexPattern: SEARCH_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
          },
        },
      },
    },
  },
  modelVersions: {
    1: {
      changes: [],
      schemas: {
        forwardCompatibility: playgroundAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: playgroundAttributesSchemaV1,
      },
    },
    2: {
      changes: [
        {
          type: 'unsafe_transform',
          transformFn: (typeSafeGuard) => typeSafeGuard(transformV1ToV2),
        },
      ],
      schemas: {
        forwardCompatibility: playgroundAttributesSchemaV2.extends({}, { unknowns: 'ignore' }),
        create: playgroundAttributesSchemaV2,
      },
    },
  },
});

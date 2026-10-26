/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { schema } from '@kbn/config-schema';
import type { Milestone } from '../../../../common/trial_companion/types';

export interface NBASavedObjectAttributes {
  openTODOs: Milestone[];
  dismiss?: boolean;
}

export const NBA_SAVED_OBJECT_TYPE = 'trial-companion-nba-milestone';

const savedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    openTODOs: {
      type: 'integer',
    },
    dismiss: {
      type: 'boolean',
    },
  },
};

const TrialCompanionNBAAttributesSchemaV1 = schema.object({
  openTODOs: schema.arrayOf(schema.number()),
  dismiss: schema.maybe(schema.boolean()),
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: TrialCompanionNBAAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
    create: TrialCompanionNBAAttributesSchemaV1,
  },
};

export const trialCompanionNBASavedObjectType: SavedObjectsType = {
  name: NBA_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: savedObjectMappings,
  modelVersions: {
    1: version1,
  },
};

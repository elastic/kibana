/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { Milestone } from '../../../../common/trial_companion/types';

export interface NBASavedObjectAttributes {
  milestoneId: Milestone;
}

export const NBA_SAVED_OBJECT_TYPE = 'trial-companion-nba-milestone';

const savedObjectMappings: SavedObjectsType['mappings'] = {
  properties: {
    milestoneId: {
      type: 'integer',
    },
  },
};

export const trialCompanionNBASavedObject: SavedObjectsType = {
  name: NBA_SAVED_OBJECT_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: savedObjectMappings,
};

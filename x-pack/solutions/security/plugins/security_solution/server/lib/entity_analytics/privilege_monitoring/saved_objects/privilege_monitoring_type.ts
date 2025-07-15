/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const privilegeMonitoringTypeName = 'privilege-monitoring-status';

export const privilegeMonitoringTypeNameMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    status: {
      type: 'keyword',
    },
  },
};

const version1: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        status: { type: 'keyword' },
      },
    },
  ],
};

export const privilegeMonitoringType: SavedObjectsType = {
  name: privilegeMonitoringTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: privilegeMonitoringTypeNameMappings,
  modelVersions: { 1: version1 },
};

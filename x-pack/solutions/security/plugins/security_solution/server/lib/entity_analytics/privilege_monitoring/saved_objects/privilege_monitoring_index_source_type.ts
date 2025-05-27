/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const privilegeMonitoringIndexSourceMappings: SavedObjectsType['mappings'] = {
  dynamic: false, // should never use true as it can cause arbitrary amounts of fields added to system index (.kibana)
  properties: {
    type: {
      type: 'keyword',
    },
    managed: {
      type: 'boolean',
    },
    indexPattern: {
      type: 'keyword',
    },
  },
};

export const PRIVILEGE_MONITORING_INDEX_SOURCE_TYPE = 'privileged_user_index_source';

export const privilegeMonitoringIndexSourceType: SavedObjectsType = {
  name: PRIVILEGE_MONITORING_INDEX_SOURCE_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: privilegeMonitoringIndexSourceMappings
};

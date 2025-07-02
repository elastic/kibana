/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const monitoringEntitySourceTypeName = 'entity-analytics-monitoring-entity-source';

export const monitoringEntitySourceTypeNameMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    type: {
      type: 'keyword',
    },
    name: {
      type: 'keyword',
    },
    managed: {
      type: 'boolean',
    },
    enabled: {
      type: 'boolean',
    },
    error: {
      type: 'keyword',
    },
    integrationName: {
      type: 'keyword',
    },
    matchers: {
      type: 'object',
      dynamic: false,
    },
    filter: {
      dynamic: false,
      type: 'object',
    },
  },
};

export const monitoringEntitySourceType: SavedObjectsType = {
  name: monitoringEntitySourceTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: monitoringEntitySourceTypeNameMappings,
};

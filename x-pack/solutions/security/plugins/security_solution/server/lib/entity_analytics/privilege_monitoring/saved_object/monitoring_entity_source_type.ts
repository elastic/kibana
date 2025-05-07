/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const monitoringEntitySourceTypeName = 'monitoring-entity-source';

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
    indexPattern: {
      type: 'keyword',
      index: false,
    },
    enabled: {
      type: 'boolean',
    },
    error: {
      type: 'keyword',
    },
    integrationName: {
      type: 'keyword',
      index: false,
    },
    matchers: {
      type: 'object',
      dynamic: false,
      properties: {
        fields: {
          type: 'keyword',
          index: false,
        },
        values: {
          type: 'keyword',
          index: false,
        },
      },
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

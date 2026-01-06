/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

export const PRIVILEGED_MONITOR_IMPORT_USERS_INDEX_MAPPING: MappingProperties = {
  user: {
    properties: {
      name: {
        type: 'keyword',
      },
    },
  },
};

export const PRIVILEGED_MONITOR_USERS_INDEX_MAPPING: MappingProperties = {
  'event.ingested': {
    type: 'date',
  },
  '@timestamp': {
    type: 'date',
  },
  'user.name': {
    type: 'keyword',
  },
  'user.is_privileged': {
    type: 'boolean',
  },
  'labels.sources': {
    type: 'keyword',
  },
  'entity_analytics_monitoring.labels.field': {
    type: 'keyword',
  },
  'entity_analytics_monitoring.labels.source': {
    type: 'keyword',
  },
  'entity_analytics_monitoring.labels.value': {
    type: 'keyword',
  },
};

export const generateUserIndexMappings = (): MappingTypeMapping => ({
  properties: PRIVILEGED_MONITOR_USERS_INDEX_MAPPING,
});

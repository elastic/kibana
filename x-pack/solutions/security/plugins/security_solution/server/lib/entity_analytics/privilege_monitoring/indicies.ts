/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping } from "@elastic/elasticsearch/lib/api/types";

type PrincipalType = 'user' | 'group';

// Static index names: may be more obvious and easier to manage.
export const privilegedMonitorBaseIndexName = '.entity_analytics.monitoring';
// Used in Phase 0.
export const getPrivilegedMonitorUsersIndex = (namespace: string) =>
  `${privilegedMonitorBaseIndexName}.users-${namespace}`;
// Not required in phase 0.
export const getPrivilegedMonitorGroupsIndex = (namespace: string) =>
  `${privilegedMonitorBaseIndexName}.groups-${namespace}`;

// Dynamic Index names: based on user or group usage. Not sure if this is good practice within Kibana, TODO: ask around.
export const getPrivilegedMonitorIndex = (namespace: string, principleType: PrincipalType) =>
  `${privilegedMonitorBaseIndexName}.${principleType}-${namespace}`;

export type MappingProperties = NonNullable<MappingTypeMapping['properties']>;

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
  'labels.is_privileged': {
    type: 'boolean',
  },
};

export const PRIVILEGED_MONITOR_GROUPS_INDEX_MAPPING: MappingProperties = {
  'event.ingested': { 
    type: 'date',
  },
  '@timestamp': {
    type: 'date',
  },
  'group.name': {
    type: 'keyword',
  },
  'indexPattern': {
    type: 'keyword',
  },
  'nameMatcher': {
    type: 'keyword',
  },
  'labels.is_privileged': {
    type: 'boolean',
  },
};

export const generateUserIndexMappings = (): MappingTypeMapping => ({
  properties: PRIVILEGED_MONITOR_USERS_INDEX_MAPPING,
});

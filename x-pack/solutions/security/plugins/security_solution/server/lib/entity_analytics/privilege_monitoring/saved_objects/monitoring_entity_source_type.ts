/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

export const monitoringEntitySourceTypeName = 'entity-analytics-monitoring-entity-source';

export const MANAGED_SOURCES_VERSION = 1; // increment this when changing the managed sources

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
    managedVersion: {
      type: 'integer',
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
    matchersModifiedByUser: {
      type: 'boolean',
    },
    filter: {
      dynamic: false,
      type: 'object',
    },
  },
};

const matcherSchema = schema.object(
  {
    fields: schema.arrayOf(schema.string(), { maxSize: 20 }), // do not expect many fields
    // Keep permissive at the SO layer; enforce strict (string[] | boolean[]) via Zod in service code.
    values: schema.arrayOf(schema.any(), { maxSize: 50 }), // values will be groups and roles, should not be huge.
  },
  { unknowns: 'ignore' }
);

// matchers size 50 is generous, should never really be this large.
const matchersSchema = schema.arrayOf(matcherSchema, { maxSize: 50 });

const baseEntitySourceSchema = {
  type: schema.maybe(schema.string()),
  name: schema.maybe(schema.string()),
  managed: schema.maybe(schema.boolean()),
  enabled: schema.maybe(schema.boolean()),
  error: schema.maybe(schema.string()),
  integrationName: schema.maybe(schema.string()),
  matchers: schema.maybe(matchersSchema),
  filter: schema.maybe(schema.any()),
};

const baseEntitySourceSchemaV2 = {
  ...baseEntitySourceSchema,
  matchersModifiedByUser: schema.boolean({ defaultValue: false }),
  managedVersion: schema.maybe(schema.number()), // or schema.number({ defaultValue: MANAGED_SOURCES_VERSION })
};

const monitoringEntitySourceModelVersion1: SavedObjectsModelVersion = {
  changes: [],
  schemas: {
    forwardCompatibility: schema.object(baseEntitySourceSchema, { unknowns: 'ignore' }),
    create: schema.object(baseEntitySourceSchema, { unknowns: 'ignore' }),
  },
};

const monitoringEntitySourceModelVersion2: SavedObjectsModelVersion = {
  changes: [
    {
      type: 'mappings_addition',
      addedMappings: {
        matchersModifiedByUser: { type: 'boolean' },
        managedVersion: { type: 'integer' },
      },
    },
    {
      type: 'data_backfill',
      backfillFn: (document) => ({
        attributes: {
          ...document.attributes,
          matchersModifiedByUser: document.attributes.matchersModifiedByUser ?? false,
          managedVersion: document.attributes.managedVersion ?? MANAGED_SOURCES_VERSION,
        },
      }),
    },
  ],
  schemas: {
    forwardCompatibility: schema.object(baseEntitySourceSchemaV2, { unknowns: 'ignore' }),
    create: schema.object(baseEntitySourceSchemaV2),
  },
};

export const monitoringEntitySourceType: SavedObjectsType = {
  name: monitoringEntitySourceTypeName,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: monitoringEntitySourceTypeNameMappings,
  modelVersions: {
    '1': monitoringEntitySourceModelVersion1,
    '2': monitoringEntitySourceModelVersion2,
  },
};

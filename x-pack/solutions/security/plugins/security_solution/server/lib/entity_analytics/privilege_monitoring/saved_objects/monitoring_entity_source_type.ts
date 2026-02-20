/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { Type } from '@kbn/config-schema';
import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectModelTransformationDoc,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';
import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type {
  MonitoringEntitySourceAttributes,
  MonitoringEntitySourceType,
} from '../../../../../common/api/entity_analytics';
import { areMatchersEqual, getDefaultMatchersForSource } from '../data_sources/matchers';

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
    integrations: {
      type: 'object',
      dynamic: false,
      properties: {
        syncMarkerIndex: {
          type: 'keyword',
        },
        syncData: {
          type: 'object',
          dynamic: false,
          properties: {
            lastFullSync: {
              type: 'date',
            },
            lastUpdateProcessed: {
              type: 'date',
            },
          },
        },
      },
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

const integrationsSyncDataSchema = schema.object(
  {
    lastFullSync: schema.maybe(schema.string()),
    lastUpdateProcessed: schema.maybe(schema.string()),
  },
  { unknowns: 'ignore' }
);

const integrationsSchema = schema.object(
  {
    syncMarkerIndex: schema.maybe(schema.string()),
    syncData: schema.maybe(integrationsSyncDataSchema),
  },
  { unknowns: 'ignore' }
);

type BaseMonitoringEntitySourceSchemaAttributes = Pick<
  MonitoringEntitySourceAttributes,
  'type' | 'name' | 'managed' | 'enabled' | 'integrationName' | 'matchers' | 'filter'
> & { error?: string };

type BaseMonitoringEntitySourceSchemaProps = {
  [Key in keyof BaseMonitoringEntitySourceSchemaAttributes]: Type<unknown>;
};

type BaseMonitoringEntitySourceSchemaV2Attributes = BaseMonitoringEntitySourceSchemaAttributes &
  Pick<
    MonitoringEntitySourceAttributes,
    'matchersModifiedByUser' | 'managedVersion' | 'integrations'
  >;

type BaseMonitoringEntitySourceSchemaV2Props = {
  [Key in keyof BaseMonitoringEntitySourceSchemaV2Attributes]: Type<unknown>;
};

const backFillFnEntitySourceV2: SavedObjectModelDataBackfillFn<
  BaseMonitoringEntitySourceSchemaV2Attributes,
  BaseMonitoringEntitySourceSchemaV2Attributes
> = (document: SavedObjectModelTransformationDoc<BaseMonitoringEntitySourceSchemaV2Attributes>) => {
  const attrs = document.attributes as BaseMonitoringEntitySourceSchemaV2Attributes;

  const defaultMatchers =
    attrs.managed === true
      ? getDefaultMatchersForSource(attrs.type as MonitoringEntitySourceType, attrs.integrationName)
      : undefined;

  const inferredModifiedByUser =
    attrs.managed === true &&
    Array.isArray(attrs.matchers) &&
    defaultMatchers != null &&
    !areMatchersEqual(attrs.matchers, defaultMatchers); // order-insensitive compare

  return {
    attributes: {
      ...attrs,
      matchersModifiedByUser: attrs.matchersModifiedByUser ?? inferredModifiedByUser,
      managedVersion: attrs.managedVersion ?? MANAGED_SOURCES_VERSION,
    },
  };
};

const baseEntitySourceSchema = {
  type: schema.maybe(schema.string()),
  name: schema.maybe(schema.string()),
  managed: schema.maybe(schema.boolean()),
  enabled: schema.maybe(schema.boolean()),
  error: schema.maybe(schema.string()),
  integrationName: schema.maybe(schema.string()),
  matchers: schema.maybe(matchersSchema),
  filter: schema.maybe(schema.any()),
} satisfies BaseMonitoringEntitySourceSchemaProps;

const baseEntitySourceSchemaV2 = {
  ...baseEntitySourceSchema,
  matchersModifiedByUser: schema.boolean({ defaultValue: false }),
  managedVersion: schema.maybe(schema.number()),
  integrations: schema.maybe(integrationsSchema),
} satisfies BaseMonitoringEntitySourceSchemaV2Props;

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
        integrations: {
          type: 'object',
          dynamic: false,
          properties: {
            syncMarkerIndex: { type: 'keyword' },
            syncData: {
              type: 'object',
              dynamic: false,
              properties: {
                lastFullSync: { type: 'date' },
                lastUpdateProcessed: { type: 'date' },
              },
            },
          },
        },
      },
    },
    {
      type: 'data_backfill',
      backfillFn: backFillFnEntitySourceV2,
    },
  ],
  schemas: {
    forwardCompatibility: schema.object(baseEntitySourceSchemaV2, { unknowns: 'ignore' }),
    create: schema.object(baseEntitySourceSchemaV2, { unknowns: 'ignore' }),
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

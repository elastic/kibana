/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectMigrationFn, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObject } from '@kbn/core/server';
import type { StoredSLODefinition } from '../domain/models';

// Matches the `ignore_above: 1024` on the flattened `labels` mapping; also bounds the
// label key/value strings so the create schema guards against unbounded input (CodeQL DoS rule).
const MAX_LABEL_LENGTH = 1024;

// Config-schema mirror of the stored SLO attributes. Nested objects stay permissive
// (`unknowns: 'allow'`) because the indicator params and settings vary by indicator
// type; only the top level uses `unknowns: 'ignore'` so that, on rollback, fields
// introduced by a later model version (e.g. `labels`) are stripped via forwardCompatibility.
const storedSloFields = {
  id: schema.string(),
  name: schema.string(),
  description: schema.string(),
  indicator: schema.object(
    { type: schema.string(), params: schema.recordOf(schema.string(), schema.any()) },
    { unknowns: 'allow' }
  ),
  timeWindow: schema.object(
    { duration: schema.string(), type: schema.string() },
    { unknowns: 'allow' }
  ),
  budgetingMethod: schema.string(),
  objective: schema.object(
    {
      target: schema.number(),
      timesliceTarget: schema.maybe(schema.number()),
      timesliceWindow: schema.maybe(schema.string()),
    },
    { unknowns: 'allow' }
  ),
  settings: schema.object(
    {
      syncDelay: schema.string(),
      frequency: schema.string(),
      preventInitialBackfill: schema.boolean(),
      syncField: schema.maybe(schema.nullable(schema.string())),
    },
    { unknowns: 'allow' }
  ),
  revision: schema.number(),
  enabled: schema.boolean(),
  tags: schema.arrayOf(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.string(),
  createdBy: schema.maybe(schema.string()),
  updatedBy: schema.maybe(schema.string()),
  groupBy: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  version: schema.number(),
  artifacts: schema.maybe(
    schema.object(
      {
        dashboards: schema.maybe(
          schema.arrayOf(schema.object({ refId: schema.string() }, { unknowns: 'allow' }))
        ),
      },
      { unknowns: 'allow' }
    )
  ),
};

const labelsField = {
  labels: schema.recordOf(
    schema.string({ maxLength: MAX_LABEL_LENGTH }),
    schema.string({ maxLength: MAX_LABEL_LENGTH })
  ),
};

const sloSchemaV1 = schema.object(storedSloFields, { unknowns: 'ignore' });
const sloSchemaV2 = schema.object({ ...storedSloFields, ...labelsField }, { unknowns: 'ignore' });

type StoredSLOBefore890 = StoredSLODefinition & {
  timeWindow: {
    duration: string;
    isRolling?: boolean;
    isCalendar?: boolean;
  };
};
const migrateSlo890: SavedObjectMigrationFn<StoredSLOBefore890, StoredSLODefinition> = (doc) => {
  const { timeWindow, ...other } = doc.attributes;
  return {
    ...doc,
    attributes: {
      ...other,
      timeWindow: {
        duration: timeWindow.duration,
        type: timeWindow.isCalendar ? 'calendarAligned' : 'rolling',
      },
    },
  };
};

export const SO_SLO_TYPE = 'slo';

export const slo: SavedObjectsType = {
  name: SO_SLO_TYPE,
  hidden: false,
  namespaceType: 'multiple-isolated',
  modelVersions: {
    1: {
      changes: [
        { type: 'mappings_addition', addedMappings: { version: { type: 'long' } } },
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            // we explicitely set the version to 1, so we know which SLOs requires a migration to the following version.
            return { attributes: { version: doc.attributes.version ?? 1 } };
          },
        },
      ],
      // forwardCompatibility excludes `labels` so a rollback from v2 strips it.
      schemas: { forwardCompatibility: sloSchemaV1 },
    },
    2: {
      changes: [
        {
          type: 'mappings_addition',
          addedMappings: { labels: { type: 'flattened', ignore_above: 1024 } },
        },
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            // backfill existing SLOs with an empty labels record
            return { attributes: { labels: doc.attributes.labels ?? {} } };
          },
        },
      ],
      schemas: { create: sloSchemaV2, forwardCompatibility: sloSchemaV2 },
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      id: { type: 'keyword' },
      name: { type: 'text' },
      description: { type: 'text' },
      indicator: {
        properties: {
          type: { type: 'keyword' },
          params: { type: 'flattened' },
        },
      },
      budgetingMethod: { type: 'keyword' },
      enabled: { type: 'boolean' },
      tags: { type: 'keyword' },
      labels: { type: 'flattened', ignore_above: 1024 },
      version: { type: 'long' },
    },
  },
  management: {
    displayName: 'SLO',
    importableAndExportable: false,
    getTitle(sloSavedObject: SavedObject<StoredSLODefinition>) {
      return `SLO: [${sloSavedObject.attributes.name}]`;
    },
  },
  migrations: {
    '8.9.0': migrateSlo890,
  },
};

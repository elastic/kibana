/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const EntityStoreGlobalStateTypeName = 'entity-store-global-state';

export const EntityStoreGlobalStateTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    entityMaintainers: {
      type: 'nested',
      properties: {
        id: { type: 'keyword' },
        interval: { type: 'keyword' },
        taskStatus: { type: 'keyword' },
      },
    },
    historySnapshot: {
      properties: {
        status: { type: 'keyword' },
        frequency: { type: 'keyword' },
        lastExecutionTimestamp: { type: 'date' },
        lastError: {
          properties: {
            message: { type: 'text' },
            timestamp: { type: 'date' },
          },
        },
      },
    },
    logsExtraction: {
      type: 'object',
      properties: {
        filter: { type: 'text' },
        additionalIndexPatterns: { type: 'keyword' },
        fieldHistoryLength: { type: 'integer' },
        lookbackPeriod: { type: 'keyword' },
        delay: { type: 'keyword' },
        docsLimit: { type: 'integer' },
        timeout: { type: 'keyword' },
        frequency: { type: 'keyword' },
      },
    },
  },
};

const entityMaintainerSchema = schema.object({
  id: schema.string(),
  interval: schema.string(),
  taskStatus: schema.oneOf([
    schema.literal('not_started'),
    schema.literal('started'),
    schema.literal('stopped'),
  ]),
});

const historySnapshotSchema = schema.object({
  status: schema.oneOf([schema.literal('started'), schema.literal('stopped')]),
  frequency: schema.string(),
  lastExecutionTimestamp: schema.maybe(schema.string()),
  lastError: schema.maybe(
    schema.object({
      message: schema.string(),
      timestamp: schema.maybe(schema.string()),
    })
  ),
});

const logExtractionSchema = schema.object({
  filter: schema.maybe(schema.string()),
  additionalIndexPatterns: schema.maybe(schema.arrayOf(schema.string())),
  fieldHistoryLength: schema.maybe(schema.number()),
  lookbackPeriod: schema.maybe(schema.string()),
  delay: schema.maybe(schema.string()),
  docsLimit: schema.maybe(schema.number()),
  timeout: schema.maybe(schema.string()),
  frequency: schema.maybe(schema.string()),
});

const globalStateSchemaV1 = schema.object({
  entityMaintainers: schema.arrayOf(entityMaintainerSchema),
  historySnapshot: historySnapshotSchema,
  logsExtraction: logExtractionSchema,
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: globalStateSchemaV1,
    forwardCompatibility: globalStateSchemaV1.extends({}, { unknowns: 'ignore' }),
  },
};

export const EntityStoreGlobalStateType: SavedObjectsType = {
  name: EntityStoreGlobalStateTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: EntityStoreGlobalStateTypeMappings,
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};

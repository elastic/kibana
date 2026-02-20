/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFullModelVersion } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const EngineDescriptorTypeName = 'entity-engine-descriptor-v2';

export const EngineDescriptorTypeMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    type: {
      type: 'keyword', // EntityType: user | host | service | generic
    },
    status: {
      type: 'keyword', // EngineStatus: installing | started | stopped | updating | error
    },
    logExtractionState: {
      properties: {
        filter: {
          type: 'keyword',
        },
        additionalIndexPattern: {
          type: 'keyword',
        },
        additionalIndexPatterns: {
          type: 'keyword',
        },
        fieldHistoryLength: {
          type: 'integer',
        },
        lookbackPeriod: {
          type: 'keyword',
        },
        delay: {
          type: 'keyword',
        },
        docsLimit: {
          type: 'integer',
        },
        timeout: {
          type: 'keyword',
        },
        frequency: {
          type: 'keyword',
        },
        paginationTimestamp: {
          type: 'date',
        },
        paginationId: {
          type: 'keyword',
        },
        lastExecutionTimestamp: {
          type: 'date',
        },
      },
    },
    error: {
      properties: {
        message: {
          type: 'text',
        },
        action: {
          type: 'keyword',
        },
      },
    },
    versionState: {
      properties: {
        version: {
          type: 'integer',
        },
        state: {
          type: 'keyword', // running | migrating
        },
        isMigratedFromV1: {
          type: 'boolean',
        },
      },
    },
  },
};

const logExtractionStateSchemaV1 = schema.object({
  filter: schema.string(),
  additionalIndexPattern: schema.string(),
  fieldHistoryLength: schema.number(),
  lookbackPeriod: schema.string(),
  delay: schema.string(),
  docsLimit: schema.number(),
  timeout: schema.string(),
  frequency: schema.string(),
  paginationTimestamp: schema.maybe(schema.string()),
  lastExecutionTimestamp: schema.maybe(schema.string()),
});

const engineDescriptorAttributesSchemaV1 = {
  type: schema.oneOf([
    schema.literal('user'),
    schema.literal('host'),
    schema.literal('service'),
    schema.literal('generic'),
  ]),
  status: schema.oneOf([
    schema.literal('installing'),
    schema.literal('started'),
    schema.literal('stopped'),
    schema.literal('updating'),
    schema.literal('error'),
  ]),
  logExtractionState: logExtractionStateSchemaV1,
  error: schema.maybe(
    schema.object({
      message: schema.string(),
      action: schema.string(),
    })
  ),
  versionState: schema.object({
    version: schema.oneOf([schema.literal(1), schema.literal(2)]),
    state: schema.oneOf([schema.literal('running'), schema.literal('migrating')]),
    isMigratedFromV1: schema.boolean(),
  }),
};

const engineDescriptorSchemaV1 = schema.object(engineDescriptorAttributesSchemaV1);

const logExtractionStateSchemaV2 = schema.object({
  filter: schema.string(),
  additionalIndexPatterns: schema.arrayOf(schema.string(), { maxSize: 10000 }),
  fieldHistoryLength: schema.number(),
  lookbackPeriod: schema.string(),
  delay: schema.string(),
  docsLimit: schema.number(),
  timeout: schema.string(),
  frequency: schema.string(),
  paginationTimestamp: schema.maybe(schema.string()),
  paginationId: schema.maybe(schema.string()),
  lastExecutionTimestamp: schema.maybe(schema.string()),
});

const engineDescriptorSchemaV2 = engineDescriptorSchemaV1.extends({
  logExtractionState: logExtractionStateSchemaV2,
});

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: engineDescriptorSchemaV1,
    forwardCompatibility: engineDescriptorSchemaV1.extends({}, { unknowns: 'ignore' }),
  },
};

const version2: SavedObjectsFullModelVersion = {
  changes: [
    {
      type: 'mappings_addition' as const,
      addedMappings: {
        logExtractionState: {
          properties: {
            additionalIndexPatterns: { type: 'keyword' as const },
            paginationId: { type: 'keyword' as const },
          },
        },
      },
    },
    {
      type: 'data_backfill' as const,
      backfillFn: (document) => {
        const { logExtractionState } = document.attributes;
        const additionalIndexPatterns = Array.isArray(logExtractionState?.additionalIndexPatterns)
          ? logExtractionState.additionalIndexPatterns
          : [];
        const paginationId = logExtractionState?.paginationId ?? '';

        return {
          attributes: {
            logExtractionState: {
              additionalIndexPatterns,
              paginationId,
            },
          },
        };
      },
    },
  ],
  schemas: {
    create: engineDescriptorSchemaV2,
    forwardCompatibility: engineDescriptorSchemaV2.extends({}, { unknowns: 'ignore' }),
  },
};

export const EngineDescriptorType: SavedObjectsType = {
  name: EngineDescriptorTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: EngineDescriptorTypeMappings,
  modelVersions: { 1: version1, 2: version2 },
  hiddenFromHttpApis: true,
};

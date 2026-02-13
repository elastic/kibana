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

const engineDescriptorAttributesSchema = {
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
  logExtractionState: schema.object({
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
  }),
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

const version1: SavedObjectsFullModelVersion = {
  changes: [],
  schemas: {
    create: schema.object(engineDescriptorAttributesSchema),
    forwardCompatibility: schema.object(engineDescriptorAttributesSchema, {
      unknowns: 'ignore',
    }),
  },
};

export const EngineDescriptorType: SavedObjectsType = {
  name: EngineDescriptorTypeName,
  hidden: false,
  namespaceType: 'multiple-isolated',
  mappings: EngineDescriptorTypeMappings,
  modelVersions: { 1: version1 },
  hiddenFromHttpApis: true,
};

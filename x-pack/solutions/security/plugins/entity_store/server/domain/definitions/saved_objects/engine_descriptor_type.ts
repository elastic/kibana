/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';

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

export function getEngineDescriptorType(savedObjectName: string): SavedObjectsType {
  return {
    name: savedObjectName,
    hidden: false,
    namespaceType: 'multiple-isolated',
    mappings: EngineDescriptorTypeMappings,
  };
}

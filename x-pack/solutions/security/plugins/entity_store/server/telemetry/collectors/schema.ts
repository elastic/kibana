/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type {
  EngineDescriptor,
  LogExtractionState,
} from '../../domain/definitions/saved_objects/engine_descriptor/constants';
import type { EntityStoreStatus } from '../../domain/types';

type EngineStatusUsage = Pick<EngineDescriptor, 'type' | 'status' | 'error' | 'versionState'> & {
  logExtractionState: Omit<
    LogExtractionState,
    'paginationTimestamp' | 'paginationId' | 'lastExecutionTimestamp'
  >;
};

export interface EntityStoreStatusUsage {
  status: EntityStoreStatus;
  engines: EngineStatusUsage[];
}

export const entityStoreStatusSchema: MakeSchemaFrom<EntityStoreStatusUsage> = {
  status: {
    type: 'keyword',
    _meta: {
      description:
        'Overall entity store status ("running", "stopped", "installing", "not_installed", "error")',
    },
  },
  engines: {
    type: 'array',
    items: {
      type: {
        type: 'keyword',
        _meta: { description: 'Engine type (e.g. "host", "user", "generic")' },
      },
      status: {
        type: 'keyword',
        _meta: { description: 'Engine status (e.g. "started", "stopped", "error")' },
      },
      logExtractionState: {
        delay: {
          type: 'keyword',
          _meta: { description: 'Initial data processing delay (e.g. "1m")' },
        },
        frequency: {
          type: 'keyword',
          _meta: { description: 'Run frequency (e.g. "30s", "1m")' },
        },
        lookbackPeriod: {
          type: 'keyword',
          _meta: { description: 'Lookback period used by the engine (e.g. "3h")' },
        },
        fieldHistoryLength: {
          type: 'long',
          _meta: { description: 'Number of historical field entries retained' },
        },
        filter: {
          type: 'keyword',
          _meta: { description: 'Filter applied to ingested documents' },
        },
        additionalIndexPatterns: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: { description: 'Additional index pattern ingested by the engine' },
          },
        },
        docsLimit: {
          type: 'long',
          _meta: { description: 'Maximum documents per extraction run' },
        },
        timeout: {
          type: 'keyword',
          _meta: { description: 'Extraction timeout (e.g. "25s")' },
        },
      },
      error: {
        message: {
          type: 'keyword',
          _meta: { description: 'Error message when engine is in error state' },
        },
        action: {
          type: 'keyword',
          _meta: { description: 'Action that caused the error ("init" or "extractLogs")' },
        },
      },
      versionState: {
        version: {
          type: 'long',
          _meta: { description: 'Engine schema version (1 or 2)' },
        },
        state: {
          type: 'keyword',
          _meta: { description: 'Engine version state ("running" or "migrating")' },
        },
        isMigratedFromV1: {
          type: 'boolean',
          _meta: { description: 'Whether the engine was migrated from v1' },
        },
      },
    },
  },
};

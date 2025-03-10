/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type {
  BaseResultActionParams,
  SiemMigrationsTelemetryEvent,
  SiemMigrationsTelemetryEventsMap,
} from './types';
import { SiemMigrationsEventTypes } from './types';

const baseResultActionSchema: RootSchema<BaseResultActionParams> = {
  result: {
    type: 'keyword',
    _meta: {
      description: 'Indicates whether the action succeeded. Can be one of `success` or `failed`',
      optional: false,
    },
  },
  errorMessage: {
    type: 'text',
    _meta: {
      description: 'The error message if action has failed',
      optional: true,
    },
  },
};
const migrationIdSchema: RootSchema<{ migrationId: string }> = {
  migrationId: {
    type: 'keyword',
    _meta: {
      description: 'SIEM migration ID',
      optional: false,
    },
  },
};

// This type ensures that the event schemas are correctly typed according to the event type
type SiemMigrationsTelemetryEventSchemas = {
  [T in SiemMigrationsEventTypes]: RootSchema<SiemMigrationsTelemetryEventsMap[T]>;
};

const eventSchemas: SiemMigrationsTelemetryEventSchemas = {
  // Setup Events
  [SiemMigrationsEventTypes.SetupConnectorSelected]: {
    connectorType: {
      type: 'keyword',
      _meta: {
        description: 'Connector type',
        optional: false,
      },
    },
    connectorId: {
      type: 'keyword',
      _meta: {
        description: 'Connector ID',
        optional: false,
      },
    },
  },
  [SiemMigrationsEventTypes.SetupMigrationOpenNew]: {
    isFirstMigration: {
      type: 'boolean',
      _meta: {
        description: 'Flag indicating if this is the first migration',
        optional: false,
      },
    },
  },
  [SiemMigrationsEventTypes.SetupMigrationOpenResources]: {
    ...migrationIdSchema,
    missingResourcesCount: {
      type: 'integer',
      _meta: {
        description: 'Number of missing resources',
        optional: false,
      },
    },
  },
  [SiemMigrationsEventTypes.SetupMigrationCreated]: {
    ...baseResultActionSchema,
    migrationId: {
      ...migrationIdSchema.migrationId,
      _meta: {
        ...migrationIdSchema.migrationId._meta,
        optional: true, // Error case does not have the migration ID
      },
    },
    rulesCount: {
      type: 'integer',
      _meta: {
        description: 'Number of rules uploaded',
        optional: false,
      },
    },
  },
  [SiemMigrationsEventTypes.SetupRulesQueryCopied]: {
    migrationId: {
      ...migrationIdSchema.migrationId,
      _meta: {
        ...migrationIdSchema.migrationId._meta,
        optional: true, // Migration is not usually created yet when the query is copied
      },
    },
  },
  [SiemMigrationsEventTypes.SetupMacrosQueryCopied]: {
    ...migrationIdSchema,
  },
  [SiemMigrationsEventTypes.SetupLookupNameCopied]: {
    ...migrationIdSchema,
  },
  [SiemMigrationsEventTypes.SetupResourcesUploaded]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    type: {
      type: 'keyword',
      _meta: {
        description: `Resource type, can be one of 'macro' or 'lookup'`,
        optional: false,
      },
    },
    count: {
      type: 'integer',
      _meta: {
        description: 'Number of resources uploaded',
        optional: false,
      },
    },
  },
  [SiemMigrationsEventTypes.StartTranslation]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    connectorId: {
      type: 'keyword',
      _meta: {
        description: 'Connector ID',
        optional: false,
      },
    },
    isRetry: {
      type: 'boolean',
      _meta: {
        description: 'Flag indicating if this is a retry',
        optional: false,
      },
    },
    retryFilter: {
      type: 'keyword',
      _meta: {
        description: 'Retry filter',
        optional: true,
      },
    },
  },

  // Translated Rule Events

  [SiemMigrationsEventTypes.TranslatedRuleUpdate]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ruleMigrationId: {
      type: 'keyword',
      _meta: {
        description: 'Rule migration ID',
        optional: false,
      },
    },
  },
  [SiemMigrationsEventTypes.TranslatedRuleInstall]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ruleMigrationId: {
      type: 'keyword',
      _meta: {
        description: 'Rule migration ID',
        optional: false,
      },
    },
    author: {
      type: 'keyword',
      _meta: {
        description: 'The source of the translated rule. Can be one of elastic` or `custom`',
        optional: false,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Is installed rule enabled',
        optional: false,
      },
    },
    prebuiltRule: {
      _meta: {
        description: 'Matched elastic prebuilt rule details',
        optional: true,
      },
      properties: {
        id: {
          type: 'keyword',
          _meta: {
            description: 'Matched elastic prebuilt rule ID',
            optional: false,
          },
        },
        title: {
          type: 'keyword',
          _meta: {
            description: 'Matched elastic prebuilt rule title',
            optional: false,
          },
        },
      },
    },
  },
  [SiemMigrationsEventTypes.TranslatedRuleBulkInstall]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Are installed rules enabled',
        optional: false,
      },
    },
    count: {
      type: 'integer',
      _meta: {
        description: 'Number of rules to be installed',
        optional: false,
      },
    },
  },
};

export const siemMigrationsTelemetryEvents: SiemMigrationsTelemetryEvent[] = Object.entries(
  eventSchemas
).map(([key, schema]) => ({ eventType: key as SiemMigrationsEventTypes, schema }));

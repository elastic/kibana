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
import { SiemMigrationsRuleEventTypes, SiemMigrationsDashboardEventTypes } from './types';
import type { SiemMigrationVendor } from '../../../../../../common/siem_migrations/types';

export const siemMigrationEventNames = {
  [SiemMigrationsRuleEventTypes.SetupConnectorSelected]: 'Connector Selected',
  [SiemMigrationsDashboardEventTypes.SetupConnectorSelected]: 'Connector Selected',
  [SiemMigrationsRuleEventTypes.SetupMigrationOpenNew]: 'Open new rules migration',
  [SiemMigrationsDashboardEventTypes.SetupMigrationOpenNew]: 'Open new dashboard migration',
  [SiemMigrationsRuleEventTypes.SetupMigrationCreated]: 'Create new rules migration',
  [SiemMigrationsDashboardEventTypes.SetupMigrationCreated]: 'Create new dashboard migration',
  [SiemMigrationsRuleEventTypes.SetupMigrationDeleted]: 'Migration deleted',
  [SiemMigrationsDashboardEventTypes.SetupMigrationDeleted]: 'Migration deleted',
  [SiemMigrationsRuleEventTypes.SetupResourcesUploaded]: 'Upload rule resources',
  [SiemMigrationsDashboardEventTypes.SetupResourcesUploaded]: 'Upload dashboard resources',
  [SiemMigrationsRuleEventTypes.SetupMigrationOpenResources]: 'Rules Open Resources',
  [SiemMigrationsDashboardEventTypes.SetupMigrationOpenResources]: 'Dashboard Open Resources',
  [SiemMigrationsRuleEventTypes.SetupQueryCopied]: 'Copy rules query',
  [SiemMigrationsDashboardEventTypes.SetupQueryCopied]: 'Copy dashboard query',
  [SiemMigrationsRuleEventTypes.SetupMacrosQueryCopied]: 'Copy macros query',
  [SiemMigrationsDashboardEventTypes.SetupMacrosQueryCopied]: 'Copy macros query',
  [SiemMigrationsRuleEventTypes.SetupLookupNameCopied]: 'Copy lookup name',
  [SiemMigrationsDashboardEventTypes.SetupLookupNameCopied]: 'Copy lookup name',
  [SiemMigrationsRuleEventTypes.StartMigration]: 'Start rule migration',
  [SiemMigrationsDashboardEventTypes.StartMigration]: 'Start dashboard migration',
  [SiemMigrationsRuleEventTypes.StopMigration]: 'Stop rule migration',
  [SiemMigrationsDashboardEventTypes.StopMigration]: 'Stop dashboard migration',
  [SiemMigrationsRuleEventTypes.TranslatedItemUpdate]: 'Update translated rule',
  [SiemMigrationsDashboardEventTypes.TranslatedItemUpdate]: 'Update translated dashboard',
  [SiemMigrationsRuleEventTypes.TranslatedItemInstall]: 'Install translated rule',
  [SiemMigrationsDashboardEventTypes.TranslatedItemInstall]: 'Install translated dashboard',
  [SiemMigrationsRuleEventTypes.TranslatedBulkInstall]: 'Bulk install translated rules',
  [SiemMigrationsDashboardEventTypes.TranslatedBulkInstall]: 'Bulk install translated dashboards',
};

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

const eventNameSchema: RootSchema<{ eventName: string }> = {
  eventName: {
    type: 'keyword',
    _meta: {
      description: 'The event name/description',
      optional: false,
    },
  },
};

const vendorSchema: RootSchema<{ vendor?: SiemMigrationVendor }> = {
  vendor: {
    type: 'keyword',
    _meta: {
      description: 'Vendor of the migration',
      optional: true,
    },
  },
};

// This type ensures that the event schemas are correctly typed according to the event type
type SiemMigrationsTelemetryEventSchemas = {
  [T in keyof SiemMigrationsTelemetryEventsMap]: RootSchema<SiemMigrationsTelemetryEventsMap[T]>;
};

const eventSchemas: SiemMigrationsTelemetryEventSchemas = {
  // Setup Events
  [SiemMigrationsRuleEventTypes.SetupConnectorSelected]: {
    ...eventNameSchema,
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
  [SiemMigrationsRuleEventTypes.SetupMigrationOpenNew]: {
    ...eventNameSchema,
    isFirstMigration: {
      type: 'boolean',
      _meta: {
        description: 'Flag indicating if this is the first migration',
        optional: false,
      },
    },
  },
  [SiemMigrationsRuleEventTypes.SetupMigrationOpenResources]: {
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
    missingResourcesCount: {
      type: 'integer',
      _meta: {
        description: 'Number of missing resources',
        optional: false,
      },
    },
  },
  [SiemMigrationsRuleEventTypes.SetupMigrationCreated]: {
    ...baseResultActionSchema,
    ...eventNameSchema,
    ...vendorSchema,
    migrationId: {
      ...migrationIdSchema.migrationId,
      _meta: {
        ...migrationIdSchema.migrationId._meta,
        optional: true, // Error case does not have the migration ID
      },
    },
    count: {
      type: 'integer',
      _meta: {
        description: 'Number of rules uploaded',
        optional: false,
      },
    },
  },
  [SiemMigrationsRuleEventTypes.SetupMigrationDeleted]: {
    ...migrationIdSchema,
    ...baseResultActionSchema,
    ...eventNameSchema,
    ...vendorSchema,
  },
  [SiemMigrationsRuleEventTypes.SetupQueryCopied]: {
    ...eventNameSchema,
    ...vendorSchema,
    migrationId: {
      ...migrationIdSchema.migrationId,
      _meta: {
        ...migrationIdSchema.migrationId._meta,
        optional: true, // Migration is not usually created yet when the query is copied
      },
    },
  },
  [SiemMigrationsRuleEventTypes.SetupMacrosQueryCopied]: {
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
  },
  [SiemMigrationsRuleEventTypes.SetupLookupNameCopied]: {
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
  },
  [SiemMigrationsRuleEventTypes.SetupResourcesUploaded]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
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
  [SiemMigrationsRuleEventTypes.StartMigration]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
    connectorId: {
      type: 'keyword',
      _meta: {
        description: 'Connector ID',
        optional: false,
      },
    },
    skipPrebuiltRulesMatching: {
      type: 'boolean',
      _meta: {
        description: 'Flag indicating if prebuilt rules should be matched',
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
  [SiemMigrationsRuleEventTypes.StopMigration]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
  },

  // Translated Rule Events

  [SiemMigrationsRuleEventTypes.TranslatedItemUpdate]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
    ruleMigrationId: {
      type: 'keyword',
      _meta: {
        description: 'Migration ID',
        optional: false,
      },
    },
  },
  [SiemMigrationsRuleEventTypes.TranslatedItemInstall]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...vendorSchema,
    ...eventNameSchema,
    ruleMigrationId: {
      type: 'keyword',
      _meta: {
        description: 'Migration ID',
        optional: false,
      },
    },
    author: {
      type: 'keyword',
      _meta: {
        description: 'The source of the translated item. Can be one of elastic` or `custom`',
        optional: false,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Is installed item enabled',
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
  [SiemMigrationsRuleEventTypes.TranslatedBulkInstall]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...vendorSchema,
    ...eventNameSchema,
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

  [SiemMigrationsDashboardEventTypes.SetupConnectorSelected]: {
    ...eventNameSchema,
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

  [SiemMigrationsDashboardEventTypes.SetupMigrationOpenNew]: {
    ...eventNameSchema,
    isFirstMigration: {
      type: 'boolean',
      _meta: {
        description: 'Flag indicating if this is the first migration',
        optional: false,
      },
    },
  },
  [SiemMigrationsDashboardEventTypes.SetupMigrationOpenResources]: {
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
    missingResourcesCount: {
      type: 'integer',
      _meta: {
        description: 'Number of missing resources',
        optional: false,
      },
    },
  },
  [SiemMigrationsDashboardEventTypes.SetupMigrationCreated]: {
    ...baseResultActionSchema,
    ...eventNameSchema,
    ...vendorSchema,
    migrationId: {
      ...migrationIdSchema.migrationId,
      _meta: {
        ...migrationIdSchema.migrationId._meta,
        optional: true, // Error case does not have the migration ID
      },
    },
    count: {
      type: 'integer',
      _meta: {
        description: 'Number of dashboards uploaded',
        optional: false,
      },
    },
  },
  [SiemMigrationsDashboardEventTypes.SetupMigrationDeleted]: {
    ...migrationIdSchema,
    ...baseResultActionSchema,
    ...eventNameSchema,
    ...vendorSchema,
  },
  [SiemMigrationsDashboardEventTypes.SetupQueryCopied]: {
    ...eventNameSchema,
    ...vendorSchema,
    migrationId: {
      ...migrationIdSchema.migrationId,
      _meta: {
        ...migrationIdSchema.migrationId._meta,
        optional: true, // Migration is not usually created yet when the query is copied
      },
    },
  },
  [SiemMigrationsDashboardEventTypes.SetupMacrosQueryCopied]: {
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
  },
  [SiemMigrationsDashboardEventTypes.SetupLookupNameCopied]: {
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
  },
  [SiemMigrationsDashboardEventTypes.SetupResourcesUploaded]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
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
  [SiemMigrationsDashboardEventTypes.StartMigration]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
    connectorId: {
      type: 'keyword',
      _meta: {
        description: 'Connector ID',
        optional: false,
      },
    },
    skipPrebuiltRulesMatching: {
      type: 'boolean',
      _meta: {
        description: 'Flag indicating if prebuilt rules should be matched',
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
  [SiemMigrationsDashboardEventTypes.StopMigration]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
  },

  [SiemMigrationsDashboardEventTypes.TranslatedItemUpdate]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...eventNameSchema,
    ...vendorSchema,
    ruleMigrationId: {
      type: 'keyword',
      _meta: {
        description: 'Migration ID',
        optional: false,
      },
    },
  },
  [SiemMigrationsDashboardEventTypes.TranslatedItemInstall]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...vendorSchema,
    ...eventNameSchema,
    ruleMigrationId: {
      type: 'keyword',
      _meta: {
        description: 'Migration ID',
        optional: false,
      },
    },
    author: {
      type: 'keyword',
      _meta: {
        description: 'The source of the translated item. Can be one of elastic` or `custom`',
        optional: false,
      },
    },
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Is installed item enabled',
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
  [SiemMigrationsDashboardEventTypes.TranslatedBulkInstall]: {
    ...baseResultActionSchema,
    ...migrationIdSchema,
    ...vendorSchema,
    ...eventNameSchema,
    enabled: {
      type: 'boolean',
      _meta: {
        description: 'Are installed dashboards enabled',
        optional: false,
      },
    },
    count: {
      type: 'integer',
      _meta: {
        description: 'Number of dashboards to be installed',
        optional: false,
      },
    },
  },
};

export const siemMigrationsTelemetryEvents: SiemMigrationsTelemetryEvent[] = Object.entries(
  eventSchemas
).map(([key, schema]) => ({ eventType: key as SiemMigrationsRuleEventTypes, schema }));

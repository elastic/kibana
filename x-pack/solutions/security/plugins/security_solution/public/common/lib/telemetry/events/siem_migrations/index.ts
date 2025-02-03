/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { BaseReportActionParams, SiemMigrationsTelemetryEvent } from './types';
import { SiemMigrationsEventTypes } from './types';

const baseReportSchema: RootSchema<BaseReportActionParams> = {
  migrationId: {
    type: 'keyword',
    _meta: {
      description: 'SIEM migration ID',
      optional: false,
    },
  },
  result: {
    type: 'keyword',
    _meta: {
      description: 'Indicates whether the action succeeded. Can be one of `success` or `failed`',
      optional: false,
    },
  },
  errorMessage: {
    type: 'keyword',
    _meta: {
      description: 'The error message if action has failed',
      optional: true,
    },
  },
};

export const translatedRuleUpdatedEvent: SiemMigrationsTelemetryEvent = {
  eventType: SiemMigrationsEventTypes.TranslatedRuleUpdate,
  schema: {
    ...baseReportSchema,
    ruleMigrationId: {
      type: 'keyword',
      _meta: {
        description: 'Rule migration ID',
        optional: false,
      },
    },
  },
};

export const translatedRuleInstallEvent: SiemMigrationsTelemetryEvent = {
  eventType: SiemMigrationsEventTypes.TranslatedRuleInstall,
  schema: {
    ...baseReportSchema,
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
};

export const translatedRuleBulkInstallEvent: SiemMigrationsTelemetryEvent = {
  eventType: SiemMigrationsEventTypes.TranslatedRuleBulkInstall,
  schema: {
    ...baseReportSchema,
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

export const siemMigrationsTelemetryEvents = [
  translatedRuleUpdatedEvent,
  translatedRuleInstallEvent,
  translatedRuleBulkInstallEvent,
];

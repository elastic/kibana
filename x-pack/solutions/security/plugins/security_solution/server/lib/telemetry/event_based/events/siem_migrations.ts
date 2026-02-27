/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/core/server';
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/types';

export enum SiemMigrationsEventTypes {
  // Common
  MigrationSuccess = 'siem_migrations_migration_success',
  MigrationAborted = 'siem_migrations_migration_aborted',
  MigrationFailure = 'siem_migrations_migration_failure',
  // Rules
  RuleTranslationSuccess = 'siem_migrations_rule_translation_success',
  RuleTranslationFailure = 'siem_migrations_rule_translation_failure',
  RuleTranslationPrebuiltRulesMatch = 'siem_migrations_prebuilt_rules_match',
  RuleTranslationIntegrationsMatch = 'siem_migrations_integration_match',
  // Dashboards
  DashboardTranslationSuccess = 'siem_migrations_dashboard_translation_success',
  DashboardTranslationFailure = 'siem_migrations_dashboard_translation_failure',
}

export const siemMigrationEventNames = {
  // Common
  [SiemMigrationsEventTypes.MigrationSuccess]: 'Migration success',
  [SiemMigrationsEventTypes.MigrationAborted]: 'Migration aborted',
  [SiemMigrationsEventTypes.MigrationFailure]: 'Migration failure',
  // Rules
  [SiemMigrationsEventTypes.RuleTranslationFailure]: 'Rule translation failure',
  [SiemMigrationsEventTypes.RuleTranslationSuccess]: 'Rule translation success',
  [SiemMigrationsEventTypes.RuleTranslationPrebuiltRulesMatch]:
    'Rule translation prebuilt rules match',
  [SiemMigrationsEventTypes.RuleTranslationIntegrationsMatch]:
    'Rule translation integrations match',
  // Dashboards
  [SiemMigrationsEventTypes.DashboardTranslationFailure]: 'Dashboard translation failure',
  [SiemMigrationsEventTypes.DashboardTranslationSuccess]: 'Dashboard translation success',
} as const;

export const SIEM_MIGRATIONS_MIGRATION_SUCCESS: EventTypeOpts<{
  model: string;
  migrationId: string;
  type: 'rules' | 'dashboards';
  duration: number;
  completed: number;
  failed: number;
  total: number;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.MigrationSuccess,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    type: {
      type: 'keyword',
      _meta: {
        description: 'The type of migration, either rules or dashboards',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    completed: {
      type: 'long',
      _meta: {
        description: 'Number of rules successfully migrated',
      },
    },
    failed: {
      type: 'long',
      _meta: {
        description: 'Number of rules that failed to migrate',
      },
    },
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of rules to migrate',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
      },
    },
  },
};

export const SIEM_MIGRATIONS_MIGRATION_FAILURE: EventTypeOpts<{
  model: string;
  error: string;
  migrationId: string;
  type: 'rules' | 'dashboards';
  duration: number;
  completed: number;
  failed: number;
  total: number;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.MigrationFailure,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for the migration failure',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    type: {
      type: 'keyword',
      _meta: {
        description: 'The type of migration, either rules or dashboards',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    completed: {
      type: 'long',
      _meta: {
        description: 'Number of rules successfully migrated',
      },
    },
    failed: {
      type: 'long',
      _meta: {
        description: 'Number of rules that failed to migrate',
      },
    },
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of rules to migrate',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
      },
    },
  },
};

export const SIEM_MIGRATIONS_MIGRATION_ABORTED: EventTypeOpts<{
  model: string;
  reason: string;
  migrationId: string;
  type: 'rules' | 'dashboards';
  duration: number;
  completed: number;
  failed: number;
  total: number;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.MigrationAborted,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    reason: {
      type: 'keyword',
      _meta: {
        description: 'The reason of the migration abort',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    type: {
      type: 'keyword',
      _meta: {
        description: 'The type of migration, either rules or dashboards',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    completed: {
      type: 'long',
      _meta: {
        description: 'Number of rules successfully migrated',
      },
    },
    failed: {
      type: 'long',
      _meta: {
        description: 'Number of rules that failed to migrate',
      },
    },
    total: {
      type: 'long',
      _meta: {
        description: 'Total number of rules to migrate',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
      },
    },
  },
};

export const SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS: EventTypeOpts<{
  model: string;
  migrationId: string;
  duration: number;
  translationResult: string;
  prebuiltMatch: boolean;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.RuleTranslationSuccess,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    translationResult: {
      type: 'keyword',
      _meta: {
        description: 'Describes if the translation was full or partial',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    prebuiltMatch: {
      type: 'boolean',
      _meta: {
        description: 'Whether a prebuilt rule was matched',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
      },
    },
  },
};

export const SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE: EventTypeOpts<{
  model: string;
  error: string;
  migrationId: string;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.RuleTranslationFailure,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for the translation failure',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
      },
    },
  },
};

export const SIEM_MIGRATIONS_PREBUILT_RULES_MATCH: EventTypeOpts<{
  model: string;
  migrationId: string;
  preFilterRuleNames: string[];
  preFilterRuleCount: number;
  postFilterRuleName: string;
  postFilterRuleCount: number;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.RuleTranslationPrebuiltRulesMatch,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    preFilterRuleNames: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'List of matched rules from Semantic search before LLM filtering',
        },
      },
    },
    preFilterRuleCount: {
      type: 'long',
      _meta: {
        description: 'Count of rules matched before LLM filtering',
      },
    },
    postFilterRuleName: {
      type: 'keyword',
      _meta: {
        description: 'List of matched rules from Semantic search after LLM filtering',
      },
    },
    postFilterRuleCount: {
      type: 'long',
      _meta: {
        description: 'Count of rules matched before LLM filtering',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
      },
    },
  },
};

export const SIEM_MIGRATIONS_INTEGRATIONS_MATCH: EventTypeOpts<{
  model: string;
  migrationId: string;
  preFilterIntegrationNames: string[];
  preFilterIntegrationCount: number;
  postFilterIntegrationName: string;
  postFilterIntegrationCount: number;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.RuleTranslationIntegrationsMatch,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    preFilterIntegrationNames: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'List of matched integrations from Semantic search before LLM filtering',
        },
      },
    },
    preFilterIntegrationCount: {
      type: 'long',
      _meta: {
        description: 'Count of integrations matched before LLM filtering',
      },
    },
    postFilterIntegrationName: {
      type: 'keyword',
      _meta: {
        description: 'List of matched integrations from Semantic search after LLM filtering',
      },
    },
    postFilterIntegrationCount: {
      type: 'long',
      _meta: {
        description: 'Count of integrations matched before LLM filtering',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
      },
    },
  },
};

export const SIEM_MIGRATIONS_DASHBOARD_TRANSLATION_SUCCESS: EventTypeOpts<{
  model: string;
  migrationId: string;
  duration: number;
  translationResult: string;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.DashboardTranslationSuccess,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    translationResult: {
      type: 'keyword',
      _meta: {
        description: 'Describes if the translation was full or partial',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'Duration of the migration in milliseconds',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
      },
    },
  },
};

export const SIEM_MIGRATIONS_DASHBOARD_TRANSLATION_FAILURE: EventTypeOpts<{
  model: string;
  error: string;
  migrationId: string;
  eventName: string;
  vendor: SiemMigrationVendor;
}> = {
  eventType: SiemMigrationsEventTypes.DashboardTranslationFailure,
  schema: {
    eventName: {
      type: 'keyword',
      _meta: {
        description: 'The event name/description',
        optional: false,
      },
    },
    error: {
      type: 'keyword',
      _meta: {
        description: 'Error message for the translation failure',
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The LLM model that was used',
      },
    },
    migrationId: {
      type: 'keyword',
      _meta: {
        description: 'Unique identifier for the migration',
      },
    },
    vendor: {
      type: 'keyword',
      _meta: {
        description: 'Vendor of the migration',
        optional: false,
      },
    },
  },
};

export const SIEM_MIGRATIONS_EVENTS = [
  SIEM_MIGRATIONS_MIGRATION_SUCCESS,
  SIEM_MIGRATIONS_MIGRATION_ABORTED,
  SIEM_MIGRATIONS_MIGRATION_FAILURE,
  SIEM_MIGRATIONS_RULE_TRANSLATION_SUCCESS,
  SIEM_MIGRATIONS_RULE_TRANSLATION_FAILURE,
  SIEM_MIGRATIONS_PREBUILT_RULES_MATCH,
  SIEM_MIGRATIONS_INTEGRATIONS_MATCH,
  SIEM_MIGRATIONS_DASHBOARD_TRANSLATION_SUCCESS,
  SIEM_MIGRATIONS_DASHBOARD_TRANSLATION_FAILURE,
];

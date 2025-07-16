/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { siemMigrationEventNames } from '../../../common/lib/telemetry/events/siem_migrations';
import type {
  RuleMigrationResourceType,
  RuleMigrationRule,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import type {
  BaseResultActionParams,
  ReportTranslatedRuleInstallActionParams,
} from '../../../common/lib/telemetry/events/siem_migrations/types';
import { SiemMigrationsEventTypes } from '../../../common/lib/telemetry/events/siem_migrations/types';
import type { StartRuleMigrationParams } from '../api';

export class SiemRulesMigrationsTelemetry {
  constructor(private readonly telemetryService: TelemetryServiceStart) {}

  private getBaseResultParams = (error: Error | undefined): BaseResultActionParams => ({
    result: error ? 'failed' : 'success',
    ...(error && { errorMessage: error.message }),
  });

  // Setup actions

  reportConnectorSelected = (params: { connector: ActionConnector }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupConnectorSelected, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupConnectorSelected],
      connectorId: params.connector.id,
      connectorType: params.connector.actionTypeId,
    });
  };

  reportSetupMigrationOpen = (params: { isFirstMigration: boolean }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMigrationOpenNew, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupMigrationOpenNew],
      ...params,
    });
  };

  reportSetupMigrationOpenResources = (params: {
    migrationId: string;
    missingResourcesCount: number;
  }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMigrationOpenResources, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupMigrationOpenResources],
      ...params,
    });
  };

  reportSetupMigrationCreated = (params: {
    migrationId?: string;
    rulesCount: number;
    error?: Error;
  }) => {
    const { migrationId, rulesCount, error } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMigrationCreated, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupMigrationCreated],
      migrationId,
      rulesCount,
      ...this.getBaseResultParams(error),
    });
  };

  reportSetupMigrationDeleted = (params: { migrationId: string; error?: Error }) => {
    const { migrationId, error } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMigrationDeleted, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupMigrationDeleted],
      migrationId,
      ...this.getBaseResultParams(error),
    });
  };

  reportSetupResourceUploaded = (params: {
    migrationId: string;
    type: RuleMigrationResourceType;
    count: number;
    error?: Error;
  }) => {
    const { migrationId, type, count, error } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupResourcesUploaded, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupResourcesUploaded],
      migrationId,
      count,
      type,
      ...this.getBaseResultParams(error),
    });
  };

  reportSetupRulesQueryCopied = (params: { migrationId?: string }) => {
    const { migrationId } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupRulesQueryCopied, {
      migrationId,
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupRulesQueryCopied],
    });
  };

  reportSetupMacrosQueryCopied = (params: { migrationId: string }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMacrosQueryCopied, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupMacrosQueryCopied],
      ...params,
    });
  };

  reportSetupLookupNameCopied = (params: { migrationId: string }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupLookupNameCopied, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.SetupLookupNameCopied],
      ...params,
    });
  };

  reportStartTranslation = (
    params: StartRuleMigrationParams & {
      error?: Error;
    }
  ) => {
    const {
      migrationId,
      settings: { connectorId, skipPrebuiltRulesMatching = false },
      retry,
      error,
    } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.StartMigration, {
      migrationId,
      connectorId,
      isRetry: !!retry,
      skipPrebuiltRulesMatching,
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.StartMigration],
      ...(retry && { retryFilter: retry }),
      ...this.getBaseResultParams(error),
    });
  };

  reportStopTranslation = (params: { migrationId: string; error?: Error }) => {
    const { migrationId, error } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.StopMigration, {
      migrationId,
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.StopMigration],
      ...this.getBaseResultParams(error),
    });
  };

  // Translated rule actions

  reportTranslatedRuleUpdate = (params: { migrationRule: RuleMigrationRule; error?: Error }) => {
    const { migrationRule, error } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.TranslatedRuleUpdate, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.TranslatedRuleUpdate],
      migrationId: migrationRule.migration_id,
      ruleMigrationId: migrationRule.id,
      ...this.getBaseResultParams(error),
    });
  };

  reportTranslatedRuleInstall = (params: {
    migrationRule: RuleMigrationRule;
    enabled: boolean;
    error?: Error;
  }) => {
    const { migrationRule, enabled, error } = params;
    const eventParams: ReportTranslatedRuleInstallActionParams = {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.TranslatedRuleInstall],
      migrationId: migrationRule.migration_id,
      ruleMigrationId: migrationRule.id,
      author: 'custom',
      enabled,
      ...this.getBaseResultParams(error),
    };

    if (migrationRule.elastic_rule?.prebuilt_rule_id) {
      eventParams.author = 'elastic';
      eventParams.prebuiltRule = {
        id: migrationRule.elastic_rule.prebuilt_rule_id,
        title: migrationRule.elastic_rule.title,
      };
    }

    this.telemetryService.reportEvent(SiemMigrationsEventTypes.TranslatedRuleInstall, eventParams);
  };

  reportTranslatedRuleBulkInstall = (params: {
    migrationId: string;
    count: number;
    enabled: boolean;
    error?: Error;
  }) => {
    const { migrationId, count, enabled, error } = params;

    this.telemetryService.reportEvent(SiemMigrationsEventTypes.TranslatedRuleBulkInstall, {
      eventName: siemMigrationEventNames[SiemMigrationsEventTypes.TranslatedRuleBulkInstall],
      migrationId,
      count,
      enabled,
      ...this.getBaseResultParams(error),
    });
  };
}

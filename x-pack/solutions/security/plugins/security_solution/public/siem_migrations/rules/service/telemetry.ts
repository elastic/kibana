/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import type {
  RuleMigration,
  RuleMigrationResourceType,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import type {
  BaseResultActionParams,
  ReportTranslatedRuleInstallActionParams,
} from '../../../common/lib/telemetry/events/siem_migrations/types';
import { SiemMigrationsEventTypes } from '../../../common/lib/telemetry/events/siem_migrations/types';

export class SiemRulesMigrationsTelemetry {
  constructor(private readonly telemetryService: TelemetryServiceStart) {}

  private getBaseResultParams = (error: Error | undefined): BaseResultActionParams => ({
    result: error ? 'failed' : 'success',
    ...(error && { errorMessage: error.message }),
  });

  // Setup actions

  reportConnectorSelected = (params: { connector: ActionConnector }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupConnectorSelected, {
      connectorId: params.connector.id,
      connectorType: params.connector.actionTypeId,
    });
  };

  reportSetupMigrationOpen = (params: { isFirstMigration: boolean }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMigrationOpenNew, params);
  };

  reportSetupMigrationOpenResources = (params: {
    migrationId: string;
    missingResourcesCount: number;
  }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMigrationOpenResources, params);
  };

  reportSetupMigrationCreated = (params: {
    migrationId?: string;
    rulesCount: number;
    error?: Error;
  }) => {
    const { migrationId, rulesCount, error } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMigrationCreated, {
      migrationId,
      rulesCount,
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
    });
  };

  reportSetupMacrosQueryCopied = (params: { migrationId: string }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupMacrosQueryCopied, params);
  };

  reportSetupLookupNameCopied = (params: { migrationId: string }) => {
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.SetupLookupNameCopied, params);
  };

  reportStartTranslation = (params: {
    migrationId: string;
    connectorId: string;
    retry?: SiemMigrationRetryFilter;
    error?: Error;
  }) => {
    const { migrationId, connectorId, retry, error } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.StartTranslation, {
      migrationId,
      connectorId,
      isRetry: !!retry,
      ...(retry && { retryFilter: retry }),
      ...this.getBaseResultParams(error),
    });
  };

  // Translated rule actions

  reportTranslatedRuleUpdate = (params: { ruleMigration: RuleMigration; error?: Error }) => {
    const { ruleMigration, error } = params;
    this.telemetryService.reportEvent(SiemMigrationsEventTypes.TranslatedRuleUpdate, {
      migrationId: ruleMigration.migration_id,
      ruleMigrationId: ruleMigration.id,
      ...this.getBaseResultParams(error),
    });
  };

  reportTranslatedRuleInstall = (params: {
    ruleMigration: RuleMigration;
    enabled: boolean;
    error?: Error;
  }) => {
    const { ruleMigration, enabled, error } = params;
    const eventParams: ReportTranslatedRuleInstallActionParams = {
      migrationId: ruleMigration.migration_id,
      ruleMigrationId: ruleMigration.id,
      author: 'custom',
      enabled,
      ...this.getBaseResultParams(error),
    };

    if (ruleMigration.elastic_rule?.prebuilt_rule_id) {
      eventParams.author = 'elastic';
      eventParams.prebuiltRule = {
        id: ruleMigration.elastic_rule.prebuilt_rule_id,
        title: ruleMigration.elastic_rule.title,
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
      migrationId,
      count,
      enabled,
      ...this.getBaseResultParams(error),
    });
  };
}

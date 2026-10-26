/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { SiemMigrationResourceType } from '../../../../common/siem_migrations/model/common.gen';
import { siemMigrationEventNames } from '../../../common/lib/telemetry/events/siem_migrations';
import type { RuleMigrationRule } from '../../../../common/siem_migrations/model/rule_migration.gen';
import type { DashboardMigrationDashboard } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import type {
  BaseResultActionParams,
  ReportTranslatedItemInstallActionParams,
  SiemMigrationsRuleEventTypes,
  SiemMigrationsDashboardEventTypes,
} from '../../../common/lib/telemetry/events/siem_migrations/types';
import type { StartRuleMigrationParams } from '../../rules/api';
import type { StartDashboardsMigrationParams } from '../../dashboards/api';
import type { SiemMigrationVendor } from '../../../../common/siem_migrations/types';

export class SiemBaseMigrationsTelemetry {
  constructor(
    protected readonly telemetryService: TelemetryServiceStart,
    protected readonly eventTypes:
      | typeof SiemMigrationsRuleEventTypes
      | typeof SiemMigrationsDashboardEventTypes
  ) {}

  protected getBaseResultParams = (error: Error | undefined): BaseResultActionParams => ({
    result: error ? 'failed' : 'success',
    ...(error && { errorMessage: error.message }),
  });

  protected getVendor = (migrationItem: RuleMigrationRule | DashboardMigrationDashboard) => {
    if ('original_rule' in migrationItem && migrationItem.original_rule?.vendor) {
      return migrationItem.original_rule.vendor;
    }

    if ('original_dashboard' in migrationItem && migrationItem.original_dashboard?.vendor) {
      return migrationItem.original_dashboard.vendor;
    }

    return undefined;
  };

  // Setup actions

  reportConnectorSelected = (params: { connector: ActionConnector }) => {
    this.telemetryService.reportEvent(this.eventTypes.SetupConnectorSelected, {
      eventName: siemMigrationEventNames[this.eventTypes.SetupConnectorSelected],
      connectorId: params.connector.id,
      connectorType: params.connector.actionTypeId,
    });
  };

  reportSetupMigrationOpen = (params: { isFirstMigration: boolean }) => {
    this.telemetryService.reportEvent(this.eventTypes.SetupMigrationOpenNew, {
      eventName: siemMigrationEventNames[this.eventTypes.SetupMigrationOpenNew],
      ...params,
    });
  };

  reportSetupMigrationOpenResources = (params: {
    migrationId: string;
    missingResourcesCount: number;
    vendor: SiemMigrationVendor;
  }) => {
    this.telemetryService.reportEvent(this.eventTypes.SetupMigrationOpenResources, {
      eventName: siemMigrationEventNames[this.eventTypes.SetupMigrationOpenResources],
      ...params,
    });
  };

  reportSetupMigrationCreated = (params: {
    migrationId?: string;
    vendor: SiemMigrationVendor;
    count: number;
    error?: Error;
  }) => {
    const { migrationId, vendor, count, error } = params;
    this.telemetryService.reportEvent(this.eventTypes.SetupMigrationCreated, {
      eventName: siemMigrationEventNames[this.eventTypes.SetupMigrationCreated],
      migrationId,
      count,
      vendor,
      ...this.getBaseResultParams(error),
    });
  };

  reportSetupMigrationDeleted = (params: {
    migrationId: string;
    vendor?: SiemMigrationVendor;
    error?: Error;
  }) => {
    const { migrationId, vendor, error } = params;
    this.telemetryService.reportEvent(this.eventTypes.SetupMigrationDeleted, {
      eventName: siemMigrationEventNames[this.eventTypes.SetupMigrationDeleted],
      migrationId,
      vendor,
      ...this.getBaseResultParams(error),
    });
  };

  reportSetupResourceUploaded = (params: {
    migrationId: string;
    vendor?: SiemMigrationVendor;
    type: SiemMigrationResourceType;
    count: number;
    error?: Error;
  }) => {
    const { migrationId, vendor, type, count, error } = params;
    this.telemetryService.reportEvent(this.eventTypes.SetupResourcesUploaded, {
      eventName: siemMigrationEventNames[this.eventTypes.SetupResourcesUploaded],
      migrationId,
      vendor,
      count,
      type,
      ...this.getBaseResultParams(error),
    });
  };

  reportSetupQueryCopied = (params: { migrationId?: string; vendor?: SiemMigrationVendor }) => {
    const { migrationId, vendor } = params;
    this.telemetryService.reportEvent(this.eventTypes.SetupQueryCopied, {
      migrationId,
      vendor,
      eventName: siemMigrationEventNames[this.eventTypes.SetupQueryCopied],
    });
  };

  reportSetupMacrosQueryCopied = (params: {
    migrationId: string;
    vendor?: SiemMigrationVendor;
  }) => {
    this.telemetryService.reportEvent(this.eventTypes.SetupMacrosQueryCopied, {
      eventName: siemMigrationEventNames[this.eventTypes.SetupMacrosQueryCopied],
      ...params,
    });
  };

  reportSetupLookupNameCopied = (params: { migrationId: string; vendor?: SiemMigrationVendor }) => {
    this.telemetryService.reportEvent(this.eventTypes.SetupLookupNameCopied, {
      eventName: siemMigrationEventNames[this.eventTypes.SetupLookupNameCopied],
      ...params,
    });
  };

  reportStopTranslation = (params: {
    migrationId: string;
    vendor?: SiemMigrationVendor;
    error?: Error;
  }) => {
    const { migrationId, vendor, error } = params;
    this.telemetryService.reportEvent(this.eventTypes.StopMigration, {
      migrationId,
      vendor,
      eventName: siemMigrationEventNames[this.eventTypes.StopMigration],
      ...this.getBaseResultParams(error),
    });
  };

  // Translated migration actions

  reportTranslatedItemUpdate = (params: {
    migrationItem: RuleMigrationRule | DashboardMigrationDashboard;
    error?: Error;
  }) => {
    const { migrationItem, error } = params;
    this.telemetryService.reportEvent(this.eventTypes.TranslatedItemUpdate, {
      eventName: siemMigrationEventNames[this.eventTypes.TranslatedItemUpdate],
      migrationId: migrationItem.migration_id,
      ruleMigrationId: migrationItem.id,
      vendor: this.getVendor(migrationItem),
      ...this.getBaseResultParams(error),
    });
  };

  reportTranslatedItemInstall = (params: {
    migrationItem: RuleMigrationRule | DashboardMigrationDashboard;
    enabled: boolean;
    error?: Error;
  }) => {
    const { migrationItem, enabled, error } = params;
    const eventParams: ReportTranslatedItemInstallActionParams = {
      eventName: siemMigrationEventNames[this.eventTypes.TranslatedItemInstall],
      migrationId: migrationItem.migration_id,
      ruleMigrationId: migrationItem.id,
      author: 'custom',
      enabled,
      vendor: this.getVendor(migrationItem),
      ...this.getBaseResultParams(error),
    };

    if ('elastic_rule' in migrationItem && migrationItem.elastic_rule?.prebuilt_rule_id) {
      eventParams.author = 'elastic';
      eventParams.prebuiltRule = {
        id: migrationItem.elastic_rule.prebuilt_rule_id,
        title: migrationItem.elastic_rule.title,
      };
    }

    this.telemetryService.reportEvent(this.eventTypes.TranslatedItemInstall, eventParams);
  };

  reportTranslatedItemBulkInstall = (params: {
    migrationId: string;
    count: number;
    enabled: boolean;
    error?: Error;
    vendor?: SiemMigrationVendor;
  }) => {
    const { migrationId, count, enabled, error, vendor } = params;

    this.telemetryService.reportEvent(this.eventTypes.TranslatedBulkInstall, {
      eventName: siemMigrationEventNames[this.eventTypes.TranslatedBulkInstall],
      migrationId,
      vendor,
      count,
      enabled,
      ...this.getBaseResultParams(error),
    });
  };

  reportStartTranslation = (
    params:
      | (StartDashboardsMigrationParams & { vendor: SiemMigrationVendor })
      | (StartRuleMigrationParams & {
          error?: Error;
          vendor: SiemMigrationVendor;
        })
  ) => {
    const { migrationId, vendor, settings, retry } = params;
    const error = 'error' in params ? params.error : undefined;
    this.telemetryService.reportEvent(this.eventTypes.StartMigration, {
      migrationId,
      vendor,
      connectorId: settings?.connectorId,
      isRetry: !!retry,
      skipPrebuiltRulesMatching:
        'skipPrebuiltRulesMatching' in settings
          ? settings.skipPrebuiltRulesMatching ?? false
          : false,
      eventName: siemMigrationEventNames[this.eventTypes.StartMigration],
      ...(retry && { retryFilter: retry }),
      ...this.getBaseResultParams(error),
    });
  };
}

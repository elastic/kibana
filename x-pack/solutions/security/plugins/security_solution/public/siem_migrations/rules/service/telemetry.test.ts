/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import { siemMigrationEventNames } from '../../../common/lib/telemetry/events/siem_migrations';
import { SiemMigrationsRuleEventTypes } from '../../../common/lib/telemetry/events/siem_migrations/types';
import { migrationRules } from '../__mocks__/migration_rules';
import { SiemRulesMigrationsTelemetry } from './telemetry';
import {
  SiemMigrationRetryFilter,
  SiemMigrationTaskStatus,
} from '../../../../common/siem_migrations/constants';
import { MigrationSource } from '../../common/types';

const defaultMigrationStats = {
  id: 'mig-1',
  name: 'test-migration',
  vendor: MigrationSource.SPLUNK,
  status: SiemMigrationTaskStatus.READY,
  items: { total: 100, pending: 100, processing: 0, completed: 0, failed: 0 },
  created_at: '2025-01-01T00:00:00Z',
  last_updated_at: '2025-01-01T01:00:00Z',
};

describe('SiemRulesMigrationsTelemetry', () => {
  let telemetryService: jest.Mocked<Pick<TelemetryServiceStart, 'reportEvent'>>;
  let telemetry: SiemRulesMigrationsTelemetry;

  beforeEach(() => {
    telemetryService = {
      reportEvent: jest.fn(),
    };
    telemetry = new SiemRulesMigrationsTelemetry(telemetryService as TelemetryServiceStart);
  });

  it('reports connector selected', () => {
    const connector = { id: '123', actionTypeId: 'test' };
    telemetry.reportConnectorSelected({ connector: connector as ActionConnector });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupConnectorSelected,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupConnectorSelected],
        connectorId: '123',
        connectorType: 'test',
      }
    );
  });

  it('reports setup migration open', () => {
    telemetry.reportSetupMigrationOpen({ isFirstMigration: true });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationOpenNew,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationOpenNew],
        isFirstMigration: true,
      }
    );
  });

  it('reports setup migration open resources', () => {
    telemetry.reportSetupMigrationOpenResources({
      migrationId: 'abc',
      missingResourcesCount: 5,
      vendor: MigrationSource.SPLUNK,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationOpenResources,
      {
        eventName:
          siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationOpenResources],
        migrationId: 'abc',
        missingResourcesCount: 5,
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports setup migration created', () => {
    telemetry.reportSetupMigrationCreated({
      migrationId: 'def',
      count: 10,
      vendor: MigrationSource.SPLUNK,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationCreated,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationCreated],
        migrationId: 'def',
        count: 10,
        result: 'success',
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports setup migration created with error', () => {
    const error = new Error('test error');
    telemetry.reportSetupMigrationCreated({
      migrationId: 'def',
      vendor: MigrationSource.SPLUNK,
      count: 10,
      error,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationCreated,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationCreated],
        migrationId: 'def',
        vendor: MigrationSource.SPLUNK,
        count: 10,
        result: 'failed',
        errorMessage: 'test error',
      }
    );
  });

  it('reports setup migration deleted', () => {
    telemetry.reportSetupMigrationDeleted({ migrationId: 'ghi', vendor: MigrationSource.SPLUNK });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationDeleted,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationDeleted],
        migrationId: 'ghi',
        vendor: MigrationSource.SPLUNK,
        result: 'success',
      }
    );
  });

  it('reports setup resource uploaded', () => {
    telemetry.reportSetupResourceUploaded({
      migrationId: 'jkl',
      vendor: MigrationSource.SPLUNK,
      type: 'macro',
      count: 3,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupResourcesUploaded,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupResourcesUploaded],
        migrationId: 'jkl',
        vendor: MigrationSource.SPLUNK,
        type: 'macro',
        count: 3,
        result: 'success',
      }
    );
  });

  it('reports setup rules query copied', () => {
    telemetry.reportSetupQueryCopied({ migrationId: 'mno', vendor: MigrationSource.SPLUNK });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupQueryCopied,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupQueryCopied],
        migrationId: 'mno',
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports start rule migration', () => {
    telemetry.reportStartTranslation({
      migrationId: defaultMigrationStats.id,
      vendor: defaultMigrationStats.vendor,
      settings: {
        connectorId: 'test-connector',
        skipPrebuiltRulesMatching: true,
      },
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.StartMigration,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.StartMigration],
        migrationId: defaultMigrationStats.id,
        vendor: defaultMigrationStats.vendor,
        connectorId: 'test-connector',
        isRetry: false,
        skipPrebuiltRulesMatching: true,
        result: 'success',
      }
    );
  });

  it('reports retry rule migration', () => {
    telemetry.reportStartTranslation({
      migrationId: defaultMigrationStats.id,
      vendor: defaultMigrationStats.vendor,
      settings: {
        connectorId: 'test-connector',
        skipPrebuiltRulesMatching: false,
      },
      retry: SiemMigrationRetryFilter.FAILED,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.StartMigration,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.StartMigration],
        migrationId: defaultMigrationStats.id,
        vendor: defaultMigrationStats.vendor,
        connectorId: 'test-connector',
        isRetry: true,
        skipPrebuiltRulesMatching: false,
        retryFilter: 'failed',
        result: 'success',
      }
    );
  });

  it('reports translated rule install', () => {
    const migrationRule = migrationRules[0];
    telemetry.reportTranslatedItemInstall({
      migrationItem: migrationRule,
      enabled: true,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.TranslatedItemInstall,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.TranslatedItemInstall],
        migrationId: migrationRule.migration_id,
        vendor: MigrationSource.SPLUNK,
        ruleMigrationId: '1',
        author: 'elastic',
        enabled: true,
        result: 'success',
        prebuiltRule: {
          id: 'b240bfb8-26b7-4e5e-924e-218144a3fa71',
          title: 'Spike in Network Traffic',
        },
      }
    );
  });
});

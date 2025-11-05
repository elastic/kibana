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
import { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';

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
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationOpenResources,
      {
        eventName:
          siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationOpenResources],
        migrationId: 'abc',
        missingResourcesCount: 5,
      }
    );
  });

  it('reports setup migration created', () => {
    telemetry.reportSetupMigrationCreated({ migrationId: 'def', rulesCount: 10 });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationCreated,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationCreated],
        migrationId: 'def',
        rulesCount: 10,
        result: 'success',
      }
    );
  });

  it('reports setup migration created with error', () => {
    const error = new Error('test error');
    telemetry.reportSetupMigrationCreated({
      migrationId: 'def',
      rulesCount: 10,
      error,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationCreated,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationCreated],
        migrationId: 'def',
        rulesCount: 10,
        result: 'failed',
        errorMessage: 'test error',
      }
    );
  });

  it('reports setup migration deleted', () => {
    telemetry.reportSetupMigrationDeleted({ migrationId: 'ghi' });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupMigrationDeleted,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupMigrationDeleted],
        migrationId: 'ghi',
        result: 'success',
      }
    );
  });

  it('reports setup resource uploaded', () => {
    telemetry.reportSetupResourceUploaded({
      migrationId: 'jkl',
      type: 'macro',
      count: 3,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupResourcesUploaded,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupResourcesUploaded],
        migrationId: 'jkl',
        type: 'macro',
        count: 3,
        result: 'success',
      }
    );
  });

  it('reports setup rules query copied', () => {
    telemetry.reportSetupQueryCopied({ migrationId: 'mno' });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.SetupQueryCopied,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.SetupQueryCopied],
        migrationId: 'mno',
      }
    );
  });

  it('reports start rule migration', () => {
    telemetry.reportStartTranslation({
      migrationId: 'pqr',
      settings: {
        connectorId: 'test-connector',
        skipPrebuiltRulesMatching: true,
      },
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsRuleEventTypes.StartMigration,
      {
        eventName: siemMigrationEventNames[SiemMigrationsRuleEventTypes.StartMigration],
        migrationId: 'pqr',
        connectorId: 'test-connector',
        isRetry: false,
        skipPrebuiltRulesMatching: true,
        result: 'success',
      }
    );
  });

  it('reports retry rule migration', () => {
    telemetry.reportStartTranslation({
      migrationId: 'stu',
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
        migrationId: 'stu',
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
        migrationId: 'test-migration-1',
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

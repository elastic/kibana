/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import { siemMigrationEventNames } from '../../../common/lib/telemetry/events/siem_migrations';
import { SiemMigrationsDashboardEventTypes } from '../../../common/lib/telemetry/events/siem_migrations/types';
import { migrationDashboards } from '../__mocks__/migration_dashboard';
import { SiemDashboardMigrationsTelemetry } from './telemetry';
import { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import { MigrationSource } from '../../common/types';

describe('SiemDashboardMigrationsTelemetry', () => {
  let telemetryService: jest.Mocked<Pick<TelemetryServiceStart, 'reportEvent'>>;
  let telemetry: SiemDashboardMigrationsTelemetry;

  beforeEach(() => {
    telemetryService = {
      reportEvent: jest.fn(),
    };
    telemetry = new SiemDashboardMigrationsTelemetry(telemetryService as TelemetryServiceStart);
  });

  it('reports connector selected', () => {
    const connector = { id: '123', actionTypeId: 'test' };
    telemetry.reportConnectorSelected({ connector: connector as ActionConnector });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupConnectorSelected,
      {
        eventName:
          siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupConnectorSelected],
        connectorId: '123',
        connectorType: 'test',
      }
    );
  });

  it('reports setup migration open', () => {
    telemetry.reportSetupMigrationOpen({ isFirstMigration: true });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupMigrationOpenNew,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupMigrationOpenNew],
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
      SiemMigrationsDashboardEventTypes.SetupMigrationOpenResources,
      {
        eventName:
          siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupMigrationOpenResources],
        migrationId: 'abc',
        vendor: MigrationSource.SPLUNK,
        missingResourcesCount: 5,
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
      SiemMigrationsDashboardEventTypes.SetupMigrationCreated,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupMigrationCreated],
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
      count: 10,
      error,
      vendor: MigrationSource.SPLUNK,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupMigrationCreated,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupMigrationCreated],
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
      SiemMigrationsDashboardEventTypes.SetupMigrationDeleted,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupMigrationDeleted],
        migrationId: 'ghi',
        result: 'success',
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports setup migration deleted with error', () => {
    const error = new Error('delete error');
    telemetry.reportSetupMigrationDeleted({
      migrationId: 'ghi',
      error,
      vendor: MigrationSource.SPLUNK,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupMigrationDeleted,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupMigrationDeleted],
        migrationId: 'ghi',
        result: 'failed',
        errorMessage: 'delete error',
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports setup resource uploaded', () => {
    telemetry.reportSetupResourceUploaded({
      migrationId: 'jkl',
      type: 'macro',
      count: 3,
      vendor: MigrationSource.SPLUNK,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupResourcesUploaded,
      {
        eventName:
          siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupResourcesUploaded],
        migrationId: 'jkl',
        vendor: MigrationSource.SPLUNK,
        type: 'macro',
        count: 3,
        result: 'success',
      }
    );
  });

  it('reports setup resource uploaded with error', () => {
    const error = new Error('upload error');
    telemetry.reportSetupResourceUploaded({
      migrationId: 'jkl',
      type: 'macro',
      count: 3,
      error,
      vendor: MigrationSource.SPLUNK,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupResourcesUploaded,
      {
        eventName:
          siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupResourcesUploaded],
        migrationId: 'jkl',
        vendor: MigrationSource.SPLUNK,
        type: 'macro',
        count: 3,
        result: 'failed',
        errorMessage: 'upload error',
      }
    );
  });

  it('reports setup rules query copied', () => {
    telemetry.reportSetupQueryCopied({ migrationId: 'mno', vendor: MigrationSource.SPLUNK });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupQueryCopied,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupQueryCopied],
        migrationId: 'mno',
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports setup macros query copied', () => {
    telemetry.reportSetupMacrosQueryCopied({ migrationId: 'pqr', vendor: MigrationSource.SPLUNK });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupMacrosQueryCopied,
      {
        eventName:
          siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupMacrosQueryCopied],
        migrationId: 'pqr',
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports setup lookup name copied', () => {
    telemetry.reportSetupLookupNameCopied({ migrationId: 'stu', vendor: MigrationSource.SPLUNK });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.SetupLookupNameCopied,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.SetupLookupNameCopied],
        migrationId: 'stu',
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports start dashboard migration', () => {
    telemetry.reportStartTranslation({
      migrationId: 'vwx',
      vendor: MigrationSource.SPLUNK,
      settings: {
        connectorId: 'test-connector',
      },
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.StartMigration,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.StartMigration],
        migrationId: 'vwx',
        vendor: MigrationSource.SPLUNK,
        connectorId: 'test-connector',
        isRetry: false,
        skipPrebuiltRulesMatching: false,
        result: 'success',
      }
    );
  });

  it('reports retry dashboard migration', () => {
    telemetry.reportStartTranslation({
      migrationId: 'yza',
      vendor: MigrationSource.SPLUNK,
      settings: {
        connectorId: 'test-connector',
      },
      retry: SiemMigrationRetryFilter.FAILED,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.StartMigration,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.StartMigration],
        migrationId: 'yza',
        vendor: MigrationSource.SPLUNK,
        connectorId: 'test-connector',
        isRetry: true,
        skipPrebuiltRulesMatching: false,
        retryFilter: 'failed',
        result: 'success',
      }
    );
  });

  it('reports start dashboard migration with error', () => {
    const error = new Error('start error');
    telemetry.reportStartTranslation({
      migrationId: 'bcd',
      vendor: MigrationSource.SPLUNK,
      settings: {
        connectorId: 'test-connector',
      },
      error,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.StartMigration,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.StartMigration],
        migrationId: 'bcd',
        connectorId: 'test-connector',
        isRetry: false,
        skipPrebuiltRulesMatching: false,
        result: 'failed',
        errorMessage: 'start error',
        vendor: MigrationSource.SPLUNK,
      }
    );
  });

  it('reports stop dashboard migration', () => {
    telemetry.reportStopTranslation({ migrationId: 'efg', vendor: MigrationSource.SPLUNK });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.StopMigration,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.StopMigration],
        migrationId: 'efg',
        vendor: MigrationSource.SPLUNK,
        result: 'success',
      }
    );
  });

  it('reports stop dashboard migration with error', () => {
    const error = new Error('stop error');
    telemetry.reportStopTranslation({ migrationId: 'hij', vendor: MigrationSource.SPLUNK, error });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.StopMigration,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.StopMigration],
        migrationId: 'hij',
        vendor: MigrationSource.SPLUNK,
        result: 'failed',
        errorMessage: 'stop error',
      }
    );
  });

  it('reports translated dashboard update', () => {
    const migrationDashboard = migrationDashboards[0];
    telemetry.reportTranslatedItemUpdate({
      migrationItem: migrationDashboard,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.TranslatedItemUpdate,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.TranslatedItemUpdate],
        migrationId: 'mig-1',
        vendor: MigrationSource.SPLUNK,
        ruleMigrationId: '1',
        result: 'success',
      }
    );
  });

  it('reports translated dashboard update with error', () => {
    const error = new Error('update error');
    const migrationDashboard = migrationDashboards[0];
    telemetry.reportTranslatedItemUpdate({
      migrationItem: migrationDashboard,
      error,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.TranslatedItemUpdate,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.TranslatedItemUpdate],
        migrationId: 'mig-1',
        vendor: MigrationSource.SPLUNK,
        ruleMigrationId: '1',
        result: 'failed',
        errorMessage: 'update error',
      }
    );
  });

  it('reports translated dashboard install', () => {
    const migrationDashboard = migrationDashboards[0];
    telemetry.reportTranslatedItemInstall({
      migrationItem: migrationDashboard,
      enabled: true,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.TranslatedItemInstall,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.TranslatedItemInstall],
        migrationId: 'mig-1',
        vendor: MigrationSource.SPLUNK,
        ruleMigrationId: '1',
        author: 'custom',
        enabled: true,
        result: 'success',
      }
    );
  });

  it('reports translated dashboard install with error', () => {
    const error = new Error('install error');
    const migrationDashboard = migrationDashboards[0];
    telemetry.reportTranslatedItemInstall({
      migrationItem: migrationDashboard,
      enabled: true,
      error,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.TranslatedItemInstall,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.TranslatedItemInstall],
        migrationId: 'mig-1',
        vendor: MigrationSource.SPLUNK,
        ruleMigrationId: '1',
        author: 'custom',
        enabled: true,
        result: 'failed',
        errorMessage: 'install error',
      }
    );
  });

  it('reports translated dashboard bulk install', () => {
    telemetry.reportTranslatedItemBulkInstall({
      migrationId: 'klm',
      vendor: MigrationSource.SPLUNK,
      count: 5,
      enabled: true,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.TranslatedBulkInstall,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.TranslatedBulkInstall],
        migrationId: 'klm',
        vendor: MigrationSource.SPLUNK,
        count: 5,
        enabled: true,
        result: 'success',
      }
    );
  });

  it('reports translated dashboard bulk install with error', () => {
    const error = new Error('bulk install error');
    telemetry.reportTranslatedItemBulkInstall({
      migrationId: 'nop',
      vendor: MigrationSource.SPLUNK,
      count: 3,
      enabled: false,
      error,
    });
    expect(telemetryService.reportEvent).toHaveBeenCalledWith(
      SiemMigrationsDashboardEventTypes.TranslatedBulkInstall,
      {
        eventName: siemMigrationEventNames[SiemMigrationsDashboardEventTypes.TranslatedBulkInstall],
        migrationId: 'nop',
        vendor: MigrationSource.SPLUNK,
        count: 3,
        enabled: false,
        result: 'failed',
        errorMessage: 'bulk install error',
      }
    );
  });
});

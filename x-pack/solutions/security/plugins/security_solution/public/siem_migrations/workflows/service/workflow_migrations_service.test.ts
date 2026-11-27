/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { SIEM_MIGRATIONS_FEATURE_ID } from '@kbn/security-solution-features/constants';
import { WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import * as api from '../api';
import { SiemMigrationTaskStatus } from '../../../../common/siem_migrations/constants';
import type { CreateTinesWorkflowMigrationWorkflowsRequestBody } from '../../../../common/siem_migrations/workflows/types';
import type { ExperimentalFeatures } from '../../../../common';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { licenseService } from '../../../common/hooks/use_license';
import type { StartPluginsDependencies } from '../../../types';
import {
  CREATE_MIGRATION_BODY_BATCH_SIZE,
  SiemWorkflowMigrationsService,
} from './workflow_migrations_service';
import * as i18n from './translations';

jest.mock('../api', () => ({
  createWorkflowMigration: jest.fn(),
  deleteWorkflowMigration: jest.fn(),
  addTinesWorkflowsToMigration: jest.fn(),
  startWorkflowMigration: jest.fn(),
  stopWorkflowMigration: jest.fn(),
  getWorkflowMigrationStats: jest.fn(),
  getWorkflowMigrationAllStats: jest.fn(),
}));

jest.mock('../../../common/experimental_features_service', () => ({
  ExperimentalFeaturesService: { get: jest.fn() },
}));

jest.mock('../../../common/hooks/use_license', () => ({
  licenseService: { isEnterprise: jest.fn() },
}));

jest.mock('../../common/service/notifications/no_connector_notification', () => ({
  getNoConnectorToast: jest.fn().mockReturnValue({ title: 'No Connector' }),
}));

jest.mock('../../common/service/notifications/missing_capabilities_notification', () => ({
  getMissingCapabilitiesToast: jest.fn().mockReturnValue({ title: 'Missing Capabilities' }),
}));

const mockApi = api as jest.Mocked<typeof api>;

const runningStats = {
  id: 'migration-1',
  name: 'Tines migration',
  status: SiemMigrationTaskStatus.RUNNING,
  items: { total: 1, pending: 0, processing: 1, completed: 0, failed: 0 },
  created_at: '2026-01-01T00:00:00Z',
  last_updated_at: '2026-01-01T00:00:00Z',
};

const capabilitiesWith = (workflows: Record<string, boolean>, { actionsExecute = true } = {}) => ({
  [SIEM_MIGRATIONS_FEATURE_ID]: { all: true },
  actions: { execute: actionsExecute },
  workflowsManagement: workflows,
});

const getStories = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ guid: `story-${index}` })) as unknown as Exclude<
    CreateTinesWorkflowMigrationWorkflowsRequestBody,
    undefined
  >;

describe('SiemWorkflowMigrationsService', () => {
  let capabilities: Record<string, unknown>;
  let uiSettings: { isDeclared: jest.Mock; get: jest.Mock };
  let toastsAdd: jest.Mock;
  let service: SiemWorkflowMigrationsService;

  const createService = () => {
    const core = {
      application: { capabilities },
      notifications: { toasts: { add: toastsAdd } },
      uiSettings,
    } as unknown as CoreStart;
    const plugins = {
      spaces: { getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }) },
    } as unknown as StartPluginsDependencies;
    return new SiemWorkflowMigrationsService(core, plugins);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
      tinesWorkflowsMigration: true,
      siemMigrationsDisabled: false,
    } as unknown as ExperimentalFeatures);
    (licenseService.isEnterprise as jest.Mock).mockReturnValue(true);
    capabilities = capabilitiesWith({ readWorkflow: true });
    uiSettings = {
      isDeclared: jest.fn().mockReturnValue(true),
      get: jest.fn().mockReturnValue(true),
    };
    toastsAdd = jest.fn();
    mockApi.getWorkflowMigrationAllStats.mockResolvedValue([]);
    service = createService();
  });

  describe('isAvailable', () => {
    it('should be available when the flag, license, ui setting and capabilities are all in place', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('should not be available when the tinesWorkflowsMigration flag is off', () => {
      (ExperimentalFeaturesService.get as jest.Mock).mockReturnValue({
        tinesWorkflowsMigration: false,
        siemMigrationsDisabled: false,
      });

      expect(service.isAvailable()).toBe(false);
    });

    it('should not be available when the license is not enterprise', () => {
      (licenseService.isEnterprise as jest.Mock).mockReturnValue(false);

      expect(service.isAvailable()).toBe(false);
    });

    it('should not be available when the workflows ui setting is disabled', () => {
      uiSettings.get.mockReturnValue(false);

      expect(service.isAvailable()).toBe(false);
    });

    it('should not be available, without throwing, when the workflows ui setting is not declared', () => {
      uiSettings.isDeclared.mockReturnValue(false);
      uiSettings.get.mockImplementation(() => {
        throw new Error('Unrecognized setting');
      });

      expect(service.isAvailable()).toBe(false);
    });

    it('should read the workflows ui setting by its id', () => {
      service.isAvailable();

      expect(uiSettings.get).toHaveBeenCalledWith(WORKFLOWS_UI_SETTING_ID);
    });

    it('should not be available when the workflows read capability is missing', () => {
      capabilities = capabilitiesWith({});
      service = createService();

      expect(service.isAvailable()).toBe(false);
    });

    it('should not be available when the actions execute capability is missing', () => {
      capabilities = capabilitiesWith({ readWorkflow: true }, { actionsExecute: false });
      service = createService();

      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('startWorkflowMigration', () => {
    beforeEach(() => {
      mockApi.startWorkflowMigration.mockResolvedValue({ started: true });
      mockApi.getWorkflowMigrationStats.mockResolvedValue(runningStats as never);
    });

    it('should start the migration when workflows read is granted even if create and update are not', async () => {
      const result = await service.startWorkflowMigration({
        migrationId: 'migration-1',
        settings: { connectorId: 'connector-1' },
      });

      expect(result).toEqual({ started: true });
      expect(mockApi.startWorkflowMigration).toHaveBeenCalledWith({
        migrationId: 'migration-1',
        settings: { connectorId: 'connector-1' },
      });
    });

    it('should not call the API and should show a toast when workflows read is missing', async () => {
      capabilities = capabilitiesWith({});
      service = createService();

      const result = await service.startWorkflowMigration({
        migrationId: 'migration-1',
        settings: { connectorId: 'connector-1' },
      });

      expect(result).toEqual({ started: false });
      expect(mockApi.startWorkflowMigration).not.toHaveBeenCalled();
      expect(toastsAdd).toHaveBeenCalledWith({ title: 'Missing Capabilities' });
    });

    it('should show the no connector toast when there is no connector to start with', async () => {
      const result = await service.startWorkflowMigration({ migrationId: 'migration-1' });

      expect(result).toEqual({ started: false });
      expect(toastsAdd).toHaveBeenCalledWith({ title: 'No Connector' });
    });
  });

  describe('stopWorkflowMigration', () => {
    it('should not call the API and should show a toast when workflows read is missing', async () => {
      capabilities = capabilitiesWith({});
      service = createService();

      const result = await service.stopWorkflowMigration({ migrationId: 'migration-1' });

      expect(result).toEqual({ stopped: false });
      expect(mockApi.stopWorkflowMigration).not.toHaveBeenCalled();
      expect(toastsAdd).toHaveBeenCalledWith({ title: 'Missing Capabilities' });
    });

    it('should stop the migration when workflows read is granted', async () => {
      mockApi.stopWorkflowMigration.mockResolvedValue({ stopped: true });
      mockApi.getWorkflowMigrationStats.mockResolvedValue({
        ...runningStats,
        status: SiemMigrationTaskStatus.STOPPED,
      } as never);

      const result = await service.stopWorkflowMigration({ migrationId: 'migration-1' });

      expect(result).toEqual({ stopped: true });
    });
  });

  describe('addWorkflowsToMigration', () => {
    it('should reject an empty list of workflows', async () => {
      await expect(service.addWorkflowsToMigration('migration-1', [])).rejects.toThrow(
        i18n.EMPTY_WORKFLOWS_ERROR
      );
    });

    it('should add the workflows in batches to stay below the payload limit', async () => {
      mockApi.addTinesWorkflowsToMigration.mockResolvedValue(undefined);

      await service.addWorkflowsToMigration(
        'migration-1',
        getStories(CREATE_MIGRATION_BODY_BATCH_SIZE * 2 + 1)
      );

      expect(mockApi.addTinesWorkflowsToMigration).toHaveBeenCalledTimes(3);
    });

    it('should fail when any batch fails', async () => {
      mockApi.addTinesWorkflowsToMigration.mockRejectedValue(new Error('batch failed'));

      await expect(service.addWorkflowsToMigration('migration-1', getStories(1))).rejects.toThrow(
        'batch failed'
      );
    });
  });

  describe('createWorkflowMigration', () => {
    it('should create the migration, add the stories and return the migration id', async () => {
      mockApi.createWorkflowMigration.mockResolvedValue({ migration_id: 'migration-1' });
      mockApi.addTinesWorkflowsToMigration.mockResolvedValue(undefined);

      const migrationId = await service.createWorkflowMigration(getStories(2), 'My migration');

      expect(migrationId).toBe('migration-1');
      expect(mockApi.createWorkflowMigration).toHaveBeenCalledWith({ name: 'My migration' });
    });

    it('should delete the created migration when adding the stories fails', async () => {
      mockApi.createWorkflowMigration.mockResolvedValue({ migration_id: 'migration-1' });
      mockApi.addTinesWorkflowsToMigration.mockRejectedValue(new Error('upload failed'));
      mockApi.deleteWorkflowMigration.mockResolvedValue(undefined);

      await expect(service.createWorkflowMigration(getStories(1), 'My migration')).rejects.toThrow(
        'upload failed'
      );

      expect(mockApi.deleteWorkflowMigration).toHaveBeenCalledWith({
        migrationId: 'migration-1',
      });
    });

    it('should not create a migration without stories', async () => {
      await expect(service.createWorkflowMigration([], 'My migration')).rejects.toThrow(
        i18n.EMPTY_WORKFLOWS_ERROR
      );
      expect(mockApi.createWorkflowMigration).not.toHaveBeenCalled();
    });
  });
});

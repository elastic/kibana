/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  loggingSystemMock,
  elasticsearchServiceMock,
  httpServerMock,
  securityServiceMock,
} from '@kbn/core/server/mocks';
import { SiemMigrationsService } from './siem_migrations_service';
import {
  MockSiemRuleMigrationsService,
  mockSetup as mockRulesSetup,
  mockCreateClient as mockCreateRulesClient,
  mockStop as mockRulesStop,
} from './rules/__mocks__/mocks';

import {
  MockSiemDashboardMigrationsService,
  mockSetup as mockDashboardsSetup,
  mockCreateClient as mockCreateDashboardsClient,
  mockStop as mockDashboardsStop,
} from './dashboards/__mocks__/mocks';
import type { ConfigType } from '../../config';
import type { SiemMigrationsClientDependencies } from './common/types';

jest.mock('./rules/siem_rule_migrations_service');
jest.mock('./dashboards/siem_dashboard_migration_service');

const mockReplaySubject$ = { next: jest.fn(), complete: jest.fn() };
jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  ReplaySubject: jest.fn().mockImplementation(() => mockReplaySubject$),
}));

const ruleMigrationDependencies = {} as SiemMigrationsClientDependencies;

describe('SiemMigrationsService', () => {
  let siemMigrationsService: SiemMigrationsService;
  const kibanaVersion = '8.16.0';

  const currentUser = securityServiceMock.createMockAuthenticatedUser();
  const esClusterClient = elasticsearchServiceMock.createClusterClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('dashboards', () => {
    describe('with `automaticDashboardsMigration` experimental flag enabled', () => {
      beforeEach(() => {
        siemMigrationsService = new SiemMigrationsService(
          { experimentalFeatures: { automaticDashboardsMigration: true } } as ConfigType,
          logger,
          kibanaVersion
        );
      });

      it('should instantiate the dashboard migrations service', async () => {
        expect(MockSiemDashboardMigrationsService).toHaveBeenCalledWith(
          logger,
          kibanaVersion,
          undefined
        );
      });

      it('should call setup on the dashboard migrations service', async () => {
        siemMigrationsService.setup({ esClusterClient, tasksTimeoutMs: 100 });
        expect(mockDashboardsSetup).toHaveBeenCalledWith({
          esClusterClient,
          tasksTimeoutMs: 100,
          pluginStop$: mockReplaySubject$,
        });
      });

      it('should create dashboards client', async () => {
        const dashboardClientDependencies = {} as unknown as SiemMigrationsClientDependencies;
        const createDashboardsClientParams = {
          spaceId: 'default',
          request: httpServerMock.createKibanaRequest(),
          currentUser,
          dependencies: dashboardClientDependencies,
        };
        siemMigrationsService.createDashboardsClient(createDashboardsClientParams);
        expect(mockCreateDashboardsClient).toHaveBeenCalledWith(createDashboardsClientParams);
      });

      it('should trigger the pluginStop subject when stop is called', async () => {
        siemMigrationsService.stop();
        expect(mockDashboardsStop).toHaveBeenCalled();
        expect(mockReplaySubject$.next).toHaveBeenCalled();
        expect(mockReplaySubject$.complete).toHaveBeenCalled();
      });
    });

    describe('with `automaticDashboardsMigration` experimental flag disabled', () => {
      beforeEach(() => {
        siemMigrationsService = new SiemMigrationsService(
          { experimentalFeatures: { automaticDashboardsMigration: false } } as ConfigType,
          logger,
          kibanaVersion
        );
      });

      it('should instantiate the dashboard migrations service', async () => {
        expect(MockSiemDashboardMigrationsService).toHaveBeenCalledWith(
          logger,
          kibanaVersion,
          undefined
        );
      });

      it('should not call setup on the dashboard migrations service', async () => {
        siemMigrationsService.setup({ esClusterClient, tasksTimeoutMs: 100 });
        expect(mockDashboardsSetup).not.toHaveBeenCalled();
      });
    });
  });

  describe('rules', () => {
    describe('with `siemMigrationsDisabled` experimental flag enabled', () => {
      beforeEach(() => {
        siemMigrationsService = new SiemMigrationsService(
          { experimentalFeatures: { siemMigrationsDisabled: false } } as ConfigType,
          logger,
          kibanaVersion
        );
      });

      it('should instantiate the rule migrations service', async () => {
        expect(MockSiemRuleMigrationsService).toHaveBeenCalledWith(
          logger,
          kibanaVersion,
          undefined
        );
      });

      it('should call siemRuleMigrationsService setup', async () => {
        siemMigrationsService.setup({ esClusterClient, tasksTimeoutMs: 100 });

        expect(mockRulesSetup).toHaveBeenCalledWith({
          esClusterClient,
          tasksTimeoutMs: 100,
          pluginStop$: mockReplaySubject$,
        });
      });

      it('should create rules client', async () => {
        const createRulesClientParams = {
          spaceId: 'default',
          request: httpServerMock.createKibanaRequest(),
          currentUser,
          dependencies: ruleMigrationDependencies,
        };
        siemMigrationsService.createRulesClient(createRulesClientParams);
        expect(mockCreateRulesClient).toHaveBeenCalledWith(createRulesClientParams);
      });

      it('should trigger the pluginStop subject when stop is called', async () => {
        siemMigrationsService.stop();
        expect(mockRulesStop).toHaveBeenCalled();
        expect(mockReplaySubject$.next).toHaveBeenCalled();
        expect(mockReplaySubject$.complete).toHaveBeenCalled();
      });
    });

    describe('with `siemMigrationsDisabled` experimental flag disabled', () => {
      beforeEach(() => {
        siemMigrationsService = new SiemMigrationsService(
          { experimentalFeatures: { siemMigrationsDisabled: true } } as ConfigType,
          logger,
          kibanaVersion
        );
      });

      it('should instantiate the rule migrations service', async () => {
        expect(MockSiemRuleMigrationsService).toHaveBeenCalledWith(
          logger,
          kibanaVersion,
          undefined
        );
      });

      it('should not call siemRuleMigrationsService setup', async () => {
        siemMigrationsService.setup({ esClusterClient, tasksTimeoutMs: 100 });
        expect(mockRulesSetup).not.toHaveBeenCalled();
      });
    });
  });
});

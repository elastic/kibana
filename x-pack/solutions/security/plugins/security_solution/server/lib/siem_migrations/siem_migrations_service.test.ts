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
  mockSetup,
  mockCreateClient,
  mockStop,
} from './rules/__mocks__/mocks';
import type { ConfigType } from '../../config';
import type { SiemRuleMigrationsClientDependencies } from './rules/types';

jest.mock('./rules/siem_rule_migrations_service');

const mockReplaySubject$ = { next: jest.fn(), complete: jest.fn() };
jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  ReplaySubject: jest.fn().mockImplementation(() => mockReplaySubject$),
}));

const dependencies = {} as SiemRuleMigrationsClientDependencies;

describe('SiemMigrationsService', () => {
  let siemMigrationsService: SiemMigrationsService;
  const kibanaVersion = '8.16.0';

  const currentUser = securityServiceMock.createMockAuthenticatedUser();
  const esClusterClient = elasticsearchServiceMock.createClusterClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with experimental flag enabled', () => {
    beforeEach(() => {
      siemMigrationsService = new SiemMigrationsService(
        { experimentalFeatures: { siemMigrationsDisabled: false } } as ConfigType,
        logger,
        kibanaVersion
      );
    });

    it('should instantiate the rule migrations service', async () => {
      expect(MockSiemRuleMigrationsService).toHaveBeenCalledWith(logger, kibanaVersion);
    });

    describe('when setup is called', () => {
      it('should call siemRuleMigrationsService setup', async () => {
        siemMigrationsService.setup({ esClusterClient, tasksTimeoutMs: 100 });

        expect(mockSetup).toHaveBeenCalledWith({
          esClusterClient,
          tasksTimeoutMs: 100,
          pluginStop$: mockReplaySubject$,
        });
      });
    });

    describe('when createRulesClient is called', () => {
      it('should create rules client', async () => {
        const createRulesClientParams = {
          spaceId: 'default',
          request: httpServerMock.createKibanaRequest(),
          currentUser,
          dependencies,
        };
        siemMigrationsService.createRulesClient(createRulesClientParams);
        expect(mockCreateClient).toHaveBeenCalledWith(createRulesClientParams);
      });
    });

    describe('when stop is called', () => {
      it('should trigger the pluginStop subject', async () => {
        siemMigrationsService.stop();
        expect(mockStop).toHaveBeenCalled();
        expect(mockReplaySubject$.next).toHaveBeenCalled();
        expect(mockReplaySubject$.complete).toHaveBeenCalled();
      });
    });
  });

  describe('without experimental flag disabled', () => {
    beforeEach(() => {
      siemMigrationsService = new SiemMigrationsService(
        { experimentalFeatures: { siemMigrationsDisabled: true } } as ConfigType,
        logger,
        kibanaVersion
      );
    });

    it('should instantiate the rule migrations service', async () => {
      expect(MockSiemRuleMigrationsService).toHaveBeenCalledWith(logger, kibanaVersion);
    });

    describe('when setup is called', () => {
      it('should not call siemRuleMigrationsService setup', async () => {
        siemMigrationsService.setup({ esClusterClient, tasksTimeoutMs: 100 });
        expect(mockSetup).not.toHaveBeenCalled();
      });
    });
  });
});

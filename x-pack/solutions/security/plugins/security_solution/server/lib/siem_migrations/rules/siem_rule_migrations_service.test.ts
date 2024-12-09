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
import {
  SiemRuleMigrationsService,
  type SiemRuleMigrationsCreateClientParams,
} from './siem_rule_migrations_service';
import { Subject } from 'rxjs';
import {
  MockRuleMigrationsDataService,
  mockInstall,
  mockCreateClient as mockDataCreateClient,
} from './data/__mocks__/mocks';
import { mockCreateClient as mockTaskCreateClient, mockStopAll } from './task/__mocks__/mocks';
import { waitFor } from '@testing-library/dom';

jest.mock('./data/rule_migrations_data_service');
jest.mock('./task/rule_migrations_task_service');

describe('SiemRuleMigrationsService', () => {
  let ruleMigrationsService: SiemRuleMigrationsService;
  const kibanaVersion = '8.16.0';

  const esClusterClient = elasticsearchServiceMock.createClusterClient();
  const currentUser = securityServiceMock.createMockAuthenticatedUser();
  const loggerFactory = loggingSystemMock.create();
  const logger = loggerFactory.get('siemRuleMigrations');
  const pluginStop$ = new Subject<void>();

  beforeEach(() => {
    jest.clearAllMocks();
    ruleMigrationsService = new SiemRuleMigrationsService(loggerFactory, kibanaVersion);
  });

  it('should instantiate the rule migrations data stream adapter', () => {
    expect(MockRuleMigrationsDataService).toHaveBeenCalledWith(logger, kibanaVersion);
  });

  describe('when setup is called', () => {
    it('should set esClusterClient and call dataStreamAdapter.install', () => {
      ruleMigrationsService.setup({ esClusterClient, pluginStop$ });

      expect(mockInstall).toHaveBeenCalledWith({
        esClient: esClusterClient.asInternalUser,
        pluginStop$,
      });
    });

    it('should log error when data installation fails', async () => {
      const error = 'Failed to install';
      mockInstall.mockRejectedValueOnce(error);
      ruleMigrationsService.setup({ esClusterClient, pluginStop$ });

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Error installing data service.', error);
      });
    });
  });

  describe('when createClient is called', () => {
    let createClientParams: SiemRuleMigrationsCreateClientParams;

    beforeEach(() => {
      createClientParams = {
        spaceId: 'default',
        currentUser,
        request: httpServerMock.createKibanaRequest(),
      };
    });

    describe('without setup', () => {
      it('should throw an error', () => {
        expect(() => {
          ruleMigrationsService.createClient(createClientParams);
        }).toThrowError('ES client not available, please call setup first');
      });
    });

    describe('with setup', () => {
      beforeEach(() => {
        ruleMigrationsService.setup({ esClusterClient, pluginStop$ });
      });

      it('should create data client', () => {
        ruleMigrationsService.createClient(createClientParams);
        expect(mockDataCreateClient).toHaveBeenCalledWith({
          spaceId: createClientParams.spaceId,
          currentUser: createClientParams.currentUser,
          esClient: esClusterClient.asInternalUser,
        });
      });

      it('should create task client', () => {
        ruleMigrationsService.createClient(createClientParams);
        expect(mockTaskCreateClient).toHaveBeenCalledWith({
          currentUser: createClientParams.currentUser,
          dataClient: mockDataCreateClient(),
        });
      });

      it('should return data and task clients', () => {
        const client = ruleMigrationsService.createClient(createClientParams);

        expect(client).toHaveProperty('data');
        expect(client).toHaveProperty('task');
      });
    });

    describe('stop', () => {
      it('should call taskService stopAll', () => {
        ruleMigrationsService.stop();
        expect(mockStopAll).toHaveBeenCalled();
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../saved_objects', () => {
  const mockFind = jest.fn().mockResolvedValue({
    saved_objects: [],
    total: 0,
  });
  const mockEngineDescriptorInit = jest.fn();
  return {
    MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
      findByIndex: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      find: mockFind,
      findAll: jest.fn(),
    })),
    PrivilegeMonitoringEngineDescriptorClient: jest.fn().mockImplementation(() => ({
      init: mockEngineDescriptorInit,
      update: jest.fn(),
    })),
  };
});

import type { AuditLogger } from '@kbn/core/server';
import type { PrivilegeMonitoringGlobalDependencies } from './data_client';
import { PrivilegeMonitoringDataClient } from './data_client';
import {
  createInitialisationSourcesService,
  type InitialisationSourcesService,
} from './initialisation_sources_service';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  analyticsServiceMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { MonitoringEntitySourceDescriptorClient } from '../saved_objects';

describe('createInitialisationSourcesService', () => {
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const loggerMock = loggingSystemMock.createLogger();
  const auditMock = { log: jest.fn().mockReturnValue(undefined) } as unknown as AuditLogger;
  const telemetryMock = analyticsServiceMock.createAnalyticsServiceSetup();

  const savedObjectServiceMock = savedObjectsServiceMock.createStartContract();
  const dataClientDeps: PrivilegeMonitoringGlobalDependencies = {
    logger: loggerMock,
    clusterClient: clusterClientMock,
    namespace: 'default',
    kibanaVersion: '9.0.0',
    taskManager: {} as TaskManagerStartContract,
    auditLogger: auditMock,
    telemetry: telemetryMock,
    savedObjects: savedObjectServiceMock,
  };

  const mockEngineDescriptorInit = jest.fn();
  const mockFind = jest.fn().mockResolvedValue({
    saved_objects: [],
    total: 0,
  });

  jest.mock('../saved_objects', () => {
    return {
      MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
        findByIndex: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        find: mockFind,
      })),
      PrivilegeMonitoringEngineDescriptorClient: jest.fn().mockImplementation(() => ({
        init: mockEngineDescriptorInit,
        update: jest.fn(),
      })),
    };
  });

  let dataClient: PrivilegeMonitoringDataClient;
  let initSourcesService: InitialisationSourcesService;
  let monitoringDescriptorClient: MonitoringEntitySourceDescriptorClient;

  beforeEach(() => {
    jest.clearAllMocks();
    dataClient = new PrivilegeMonitoringDataClient(dataClientDeps);
    initSourcesService = createInitialisationSourcesService(dataClient);
    const mockLog = jest.fn();
    dataClient.log = mockLog;
    monitoringDescriptorClient = new (MonitoringEntitySourceDescriptorClient as jest.Mock)();
  });

  it('should create sources when none exist', async () => {
    await initSourcesService.upsertSources(monitoringDescriptorClient);
    expect(monitoringDescriptorClient.create).toHaveBeenCalledTimes(3);
    expect(monitoringDescriptorClient.update).not.toHaveBeenCalled();
    expect(dataClient.log).toHaveBeenCalledWith(
      'debug',
      expect.stringContaining('Created all default sources')
    );
  });

  it('should update sources when they already exist', async () => {
    const existingSources = [
      { id: '1', name: '.entity_analytics.monitoring.users-default' },
      { id: '2', name: '.entity_analytics.monitoring.sources.okta-default' },
      { id: '3', name: '.entity_analytics.monitoring.sources.ad-default' },
    ];
    (monitoringDescriptorClient.findAll as jest.Mock).mockResolvedValue(existingSources);

    await initSourcesService.upsertSources(monitoringDescriptorClient);

    expect(monitoringDescriptorClient.update).toHaveBeenCalledTimes(3);
    expect(monitoringDescriptorClient.create).not.toHaveBeenCalled();
    expect(dataClient.log).toHaveBeenCalledWith('debug', expect.stringContaining('Updated source'));
    expect(dataClient.log).toHaveBeenCalledWith('debug', expect.stringContaining('Updated source'));
  });

  it('should create missing sources and update existing ones', async () => {
    const existingSources = [{ id: '3', name: '.entity_analytics.monitoring.sources.ad-default' }];
    (monitoringDescriptorClient.findAll as jest.Mock).mockResolvedValue(existingSources);
    await initSourcesService.upsertSources(monitoringDescriptorClient);
    expect(monitoringDescriptorClient.update).toHaveBeenCalledTimes(1);
    expect(monitoringDescriptorClient.create).toHaveBeenCalledTimes(2);
  });
});

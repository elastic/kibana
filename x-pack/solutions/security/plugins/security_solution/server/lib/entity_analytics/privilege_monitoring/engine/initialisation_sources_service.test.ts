/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/core/server';

import {
  createInitialisationSourcesService,
  type InitialisationSourcesService,
} from './initialisation_sources_service';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { MonitoringEntitySourceDescriptorClient } from '../saved_objects';

const mockListByKuery = jest.fn().mockResolvedValue([]);
const mockBulkUpsert = jest.fn();
const mockList = jest.fn().mockResolvedValue({ sources: [], total: 0 });
const mockBulkCreate = jest.fn();

jest.mock('../saved_objects', () => {
  return {
    MonitoringEntitySourceDescriptorClient: jest.fn().mockImplementation(() => ({
      bulkCreate: mockBulkCreate,
      list: mockList,
      bulkUpsert: mockBulkUpsert,
      listByKuery: mockListByKuery,
    })),
    PrivilegeMonitoringEngineDescriptorClient: jest.fn().mockImplementation(() => ({
      init: jest.fn(),
      update: jest.fn(),
    })),
  };
});

describe('createInitialisationSourcesService', () => {
  const loggerMock = loggingSystemMock.createLogger();
  const auditMock = { log: jest.fn().mockReturnValue(undefined) } as unknown as AuditLogger;
  const namespace = 'default';

  let upsertSources: InitialisationSourcesService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBulkUpsert.mockClear();
    const monitoringDescriptorClient = new MonitoringEntitySourceDescriptorClient({
      soClient: savedObjectsClientMock.create(),
      namespace,
    });
    upsertSources = createInitialisationSourcesService({
      descriptorClient: monitoringDescriptorClient,
      logger: loggerMock,
      auditLogger: auditMock,
    });
  });

  it('should create sources when none exist', async () => {
    mockList.mockResolvedValue({ sources: [], total: 0 });
    await upsertSources(namespace);
    expect(mockBulkCreate).toHaveBeenCalledTimes(1);
    expect(mockBulkUpsert).not.toHaveBeenCalled();
  });

  it('should not update sources when they already exist', async () => {
    const existingSources = [
      { id: '1', name: '.entity_analytics.monitoring.users-default' },
      { id: '2', name: '.entity_analytics.monitoring.sources.entityanalytics_okta-default' },
      { id: '2', name: '.entity_analytics.monitoring.sources.entityanalytics_ad-default' },
    ];
    mockList.mockResolvedValue({ sources: existingSources, total: existingSources.length });
    mockListByKuery.mockResolvedValue({ sources: existingSources, total: existingSources.length });
    await upsertSources(namespace);
    expect(mockBulkUpsert).toHaveBeenCalledTimes(0);
  });

  it('should create missing sources and update existing ones', async () => {
    const existingSources = [{ id: '3', name: '.entity_analytics.monitoring.sources.ad-default' }];
    mockList.mockResolvedValue({ sources: existingSources, total: existingSources.length });
    mockListByKuery.mockResolvedValue({ sources: existingSources, total: existingSources.length });

    await upsertSources(namespace);
    expect(mockBulkUpsert).toHaveBeenCalledTimes(1);
  });
});

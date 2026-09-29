/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { AuditLogger } from '@kbn/core/server';

import {
  createInitialisationSourcesService,
  shouldUpsertManagedSources,
  type InitialisationSourcesService,
} from './initialisation_sources_service';
import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { MonitoringEntitySourceDescriptorClient } from '../saved_objects';
import { getPrivilegedMonitorUsersIndex } from '../../../../../common/entity_analytics/privileged_user_monitoring/utils';
import { integrationsSourceIndex } from '../data_sources';

const mockListByKuery = vi.fn().mockResolvedValue([]);
const mockBulkUpsert = vi.fn();
const mockList = vi.fn().mockResolvedValue({ sources: [], total: 0 });
const mockBulkCreate = vi.fn();

vi.mock('../saved_objects', () => {
  return {
    MonitoringEntitySourceDescriptorClient: vi.fn().mockImplementation(() => ({
      bulkCreate: mockBulkCreate,
      list: mockList,
      bulkUpsert: mockBulkUpsert,
      listByKuery: mockListByKuery,
    })),
    PrivilegeMonitoringEngineDescriptorClient: vi.fn().mockImplementation(() => ({
      init: vi.fn(),
      update: vi.fn(),
    })),
  };
});

describe('createInitialisationSourcesService', () => {
  const loggerMock = loggingSystemMock.createLogger();
  const auditMock = { log: vi.fn().mockReturnValue(undefined) } as unknown as AuditLogger;
  const namespace = 'default';

  let upsertSources: InitialisationSourcesService;

  beforeEach(() => {
    vi.clearAllMocks();
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
      {
        id: '1',
        name: getPrivilegedMonitorUsersIndex(namespace),
      },
      {
        id: '2',
        name: integrationsSourceIndex(namespace, 'entityanalytics_okta'),
      },
      {
        id: '3',
        name: integrationsSourceIndex(namespace, 'entityanalytics_ad'),
      },
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

  it('returns false when all required sources exist with matching versions', () => {
    const requiredSources = [
      { name: 'source-a', managedVersion: 1 },
      { name: 'source-b', managedVersion: 1 },
    ];
    const installedByName = new Map([
      ['source-a', { id: '1', name: 'source-a', managedVersion: 1 }],
      ['source-b', { id: '2', name: 'source-b', managedVersion: 1 }],
    ]);

    expect(shouldUpsertManagedSources(requiredSources, installedByName)).toBe(false);
  });

  it('returns true when a required source is missing', () => {
    const requiredSources = [{ name: 'source-a', managedVersion: 1 }];
    const installedByName = new Map();

    expect(shouldUpsertManagedSources(requiredSources, installedByName)).toBe(true);
  });

  it('returns true when a managed version differs', () => {
    const requiredSources = [{ name: 'source-a', managedVersion: 2 }];
    const installedByName = new Map([
      ['source-a', { id: '1', name: 'source-a', managedVersion: 1 }],
    ]);

    expect(shouldUpsertManagedSources(requiredSources, installedByName)).toBe(true);
  });
});

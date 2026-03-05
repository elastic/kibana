/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  Collector,
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import type { EngineDescriptor } from '../../domain/definitions/saved_objects/engine_descriptor/constants';
import { EngineDescriptorTypeName } from '../../domain/definitions/saved_objects/engine_descriptor/types';
import { ENGINE_STATUS, ENTITY_STORE_STATUS } from '../../domain/constants';
import { registerEntityStoreStatusCollector } from './register';

const mockEngine = (overrides: Partial<EngineDescriptor> = {}): EngineDescriptor => ({
  type: 'host',
  status: ENGINE_STATUS.STARTED,
  error: { message: '', action: 'init' },
  versionState: { version: 2, state: 'running', isMigratedFromV1: false },
  logExtractionState: {
    filter: '',
    additionalIndexPatterns: [],
    fieldHistoryLength: 10,
    lookbackPeriod: '3h',
    delay: '1m',
    docsLimit: 10000,
    timeout: '25s',
    frequency: '30s',
    paginationTimestamp: undefined,
    paginationId: undefined,
    lastExecutionTimestamp: undefined,
  },
  ...overrides,
});

const mockSavedObject = (attrs: EngineDescriptor) => ({
  id: `engine-${attrs.type}`,
  type: EngineDescriptorTypeName,
  attributes: attrs,
  references: [],
  score: 0,
});

describe('registerEntityStoreStatusCollector', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let collector: Collector<unknown>;
  let usageCollectionMock: ReturnType<typeof createUsageCollectionSetupMock>;
  const mockedFetchContext = createCollectorFetchContextMock();

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    usageCollectionMock = createUsageCollectionSetupMock();
    usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
      collector = new Collector(logger, config);
      return createUsageCollectionSetupMock().makeUsageCollector(config);
    });

    registerEntityStoreStatusCollector(logger, usageCollectionMock);
  });

  it('registers a collector', () => {
    expect(collector).toBeDefined();
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  it('does not register when usageCollection is undefined', () => {
    const freshMock = createUsageCollectionSetupMock();
    registerEntityStoreStatusCollector(logger, undefined);
    expect(freshMock.registerCollector).not.toHaveBeenCalled();
  });

  describe('isReady', () => {
    it('returns true', () => {
      expect(collector.isReady()).toBe(true);
    });
  });

  describe('fetch', () => {
    it('calls soClient.find with the correct parameters', async () => {
      mockedFetchContext.soClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 1000,
        page: 1,
      });

      await collector.fetch(mockedFetchContext);

      expect(mockedFetchContext.soClient.find).toHaveBeenCalledWith({
        type: EngineDescriptorTypeName,
        perPage: 1000,
        namespaces: ['*'],
      });
    });

    it('returns not_installed when no engines exist', async () => {
      mockedFetchContext.soClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 1000,
        page: 1,
      });

      const result = await collector.fetch(mockedFetchContext);

      expect(result).toEqual({
        status: ENTITY_STORE_STATUS.NOT_INSTALLED,
        engines: [],
      });
    });

    it('returns running status with engine data', async () => {
      const engine = mockEngine();
      mockedFetchContext.soClient.find.mockResolvedValue({
        saved_objects: [mockSavedObject(engine)],
        total: 1,
        per_page: 1000,
        page: 1,
      });

      const result = await collector.fetch(mockedFetchContext);

      expect(result).toEqual({
        status: ENTITY_STORE_STATUS.RUNNING,
        engines: [
          {
            type: 'host',
            status: ENGINE_STATUS.STARTED,
            error: { message: '', action: 'init' },
            versionState: { version: 2, state: 'running', isMigratedFromV1: false },
            logExtractionState: {
              filter: '',
              additionalIndexPatterns: [],
              fieldHistoryLength: 10,
              lookbackPeriod: '3h',
              delay: '1m',
              docsLimit: 10000,
              timeout: '25s',
              frequency: '30s',
            },
          },
        ],
      });
    });

    it('strips pagination fields from logExtractionState', async () => {
      const engine = mockEngine({
        logExtractionState: {
          filter: 'host.name: *',
          additionalIndexPatterns: ['logs-*'],
          fieldHistoryLength: 5,
          lookbackPeriod: '6h',
          delay: '2m',
          docsLimit: 5000,
          timeout: '30s',
          frequency: '1m',
          paginationTimestamp: '2026-01-01T00:00:00Z',
          paginationId: 'some-id',
          lastExecutionTimestamp: '2026-01-01T00:00:00Z',
        },
      });

      mockedFetchContext.soClient.find.mockResolvedValue({
        saved_objects: [mockSavedObject(engine)],
        total: 1,
        per_page: 1000,
        page: 1,
      });

      const result = await collector.fetch(mockedFetchContext);
      const engineResult = (result as { engines: Array<Record<string, unknown>> }).engines[0];
      const { logExtractionState } = engineResult as {
        logExtractionState: Record<string, unknown>;
      };

      expect(logExtractionState).not.toHaveProperty('paginationTimestamp');
      expect(logExtractionState).not.toHaveProperty('paginationId');
      expect(logExtractionState).not.toHaveProperty('lastExecutionTimestamp');
      expect(logExtractionState).toEqual({
        filter: 'host.name: *',
        additionalIndexPatterns: ['logs-*'],
        fieldHistoryLength: 5,
        lookbackPeriod: '6h',
        delay: '2m',
        docsLimit: 5000,
        timeout: '30s',
        frequency: '1m',
      });
    });

    it('returns not_installed and logs error when soClient.find throws', async () => {
      mockedFetchContext.soClient.find.mockRejectedValue(new Error('SO client unavailable'));

      const result = await collector.fetch(mockedFetchContext);

      expect(result).toEqual({
        status: ENTITY_STORE_STATUS.NOT_INSTALLED,
        engines: [],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch entity store status telemetry: SO client unavailable'
      );
    });
  });
});

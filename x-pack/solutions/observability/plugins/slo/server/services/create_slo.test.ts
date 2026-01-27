/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { CreateSLO } from './create_slo';
import { fiveMinute, oneMinute } from './fixtures/duration';
import { createAPMTransactionErrorRateIndicator, createSLOParams } from './fixtures/slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';

describe('CreateSLO', () => {
  let mockScopedClusterClient: ScopedClusterClientMock;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockLogger: jest.Mocked<MockedLogger>;
  let mockRepository: jest.Mocked<SLODefinitionRepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let createSLO: CreateSLO;

  jest.useFakeTimers().setSystemTime(new Date('2024-01-01'));

  beforeEach(() => {
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockSavedObjectsClient = savedObjectsClientMock.create();
    mockLogger = loggingSystemMock.createLogger();
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    createSLO = new CreateSLO(
      mockScopedClusterClient,
      mockRepository,
      mockSavedObjectsClient,
      mockTransformManager,
      mockSummaryTransformManager,
      mockLogger,
      'some-space',
      httpServiceMock.createStartContract().basePath,
      'some-user-id'
    );
  });

  describe('happy path', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        per_page: 20,
        page: 0,
        total: 0,
      });
    });

    it('calls the expected services', async () => {
      const sloParams = createSLOParams({
        id: 'unique-id',
        indicator: createAPMTransactionErrorRateIndicator(),
      });

      mockTransformManager.install.mockResolvedValue('slo-id-revision');
      mockSummaryTransformManager.install.mockResolvedValue('slo-summary-id-revision');

      const response = await createSLO.execute(sloParams);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sloParams,
          id: 'unique-id',
          settings: {
            syncDelay: oneMinute(),
            frequency: oneMinute(),
            preventInitialBackfill: false,
          },
          revision: 1,
          tags: [],
          enabled: true,
          version: 2,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );

      expect(mockTransformManager.install).toHaveBeenCalled();
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.putPipeline.mock.calls[0]
      ).toMatchSnapshot();
      expect(mockSummaryTransformManager.install).toHaveBeenCalled();
      expect(mockScopedClusterClient.asCurrentUser.index.mock.calls[0]).toMatchSnapshot();

      expect(response).toEqual(expect.objectContaining({ id: 'unique-id' }));
    });

    it('overrides the default values when provided', async () => {
      const sloParams = createSLOParams({
        indicator: createAPMTransactionErrorRateIndicator(),
        tags: ['one', 'two'],
        settings: {
          syncDelay: fiveMinute(),
        },
      });
      mockTransformManager.install.mockResolvedValue('slo-transform-id');

      await createSLO.execute(sloParams);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sloParams,
          id: expect.any(String),
          settings: {
            syncDelay: fiveMinute(),
            frequency: oneMinute(),
            preventInitialBackfill: false,
          },
          revision: 1,
          tags: ['one', 'two'],
          enabled: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
    });

    it('overrides the settings when provided', async () => {
      const sloParams = createSLOParams({
        indicator: createAPMTransactionErrorRateIndicator(),
        tags: ['one', 'two'],
        settings: {
          syncDelay: fiveMinute(),
          frequency: fiveMinute(),
          preventInitialBackfill: true,
        },
      });
      mockTransformManager.install.mockResolvedValue('slo-transform-id');

      await createSLO.execute(sloParams);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sloParams,
          id: expect.any(String),
          settings: {
            syncDelay: fiveMinute(),
            frequency: fiveMinute(),
            preventInitialBackfill: true,
          },
          revision: 1,
          tags: ['one', 'two'],
          enabled: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('unhappy path', () => {
    beforeEach(() => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: true,
      } as SecurityHasPrivilegesResponse);
      mockSavedObjectsClient.find.mockResolvedValue({
        saved_objects: [],
        per_page: 20,
        page: 0,
        total: 0,
      });
    });

    it('throws a SecurityException error when the user does not have the required privileges', async () => {
      mockScopedClusterClient.asCurrentUser.security.hasPrivileges.mockResolvedValue({
        has_all_requested: false,
      } as SecurityHasPrivilegesResponse);

      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError(
        "Missing ['read', 'view_index_metadata'] privileges on the source index [metrics-apm*]"
      );
    });

    it('rollbacks completed operations when rollup transform install fails', async () => {
      mockTransformManager.install.mockRejectedValue(new Error('Rollup transform install error'));
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError(
        'Rollup transform install error'
      );

      expect(mockRepository.deleteById).toHaveBeenCalled();
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(2);

      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalledTimes(1);
      expect(mockTransformManager.uninstall).toHaveBeenCalledTimes(1);
    });

    it('rollbacks completed operations when summary transform install fails', async () => {
      mockSummaryTransformManager.install.mockRejectedValue(
        new Error('Summary transform install error')
      );
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError(
        'Summary transform install error'
      );

      expect(mockRepository.deleteById).toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalled();
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(2);
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalled();
    });

    it('rollbacks completed operations when create temporary document fails', async () => {
      mockScopedClusterClient.asCurrentUser.index.mockRejectedValue(
        new Error('temporary document index failed')
      );
      const sloParams = createSLOParams({ indicator: createAPMTransactionErrorRateIndicator() });

      await expect(createSLO.execute(sloParams)).rejects.toThrowError(
        'temporary document index failed'
      );

      expect(mockRepository.deleteById).toHaveBeenCalled();
      expect(mockTransformManager.uninstall).toHaveBeenCalled();
      expect(
        mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline
      ).toHaveBeenCalledTimes(2);
      expect(mockSummaryTransformManager.uninstall).toHaveBeenCalled();
    });
  });
});

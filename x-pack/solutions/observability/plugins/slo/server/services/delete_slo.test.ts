/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { MockedLogger } from '@kbn/logging-mocks';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { DeleteSLO } from './delete_slo';
import { createAPMTransactionErrorRateIndicator, createSLO } from './fixtures/slo';
import {
  createSLORepositoryMock,
  createSummaryTransformManagerMock,
  createTransformManagerMock,
} from './mocks';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { TransformManager } from './transform_manager';

describe('DeleteSLO', () => {
  let mockRepository: jest.Mocked<SLODefinitionRepository>;
  let mockTransformManager: jest.Mocked<TransformManager>;
  let mockSummaryTransformManager: jest.Mocked<TransformManager>;
  let mockScopedClusterClient: ScopedClusterClientMock;
  let mockRulesClient: jest.Mocked<RulesClientApi>;
  let mockLogger: MockedLogger;
  let deleteSLO: DeleteSLO;

  beforeEach(() => {
    mockRepository = createSLORepositoryMock();
    mockTransformManager = createTransformManagerMock();
    mockSummaryTransformManager = createSummaryTransformManagerMock();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockRulesClient = rulesClientMock.create();
    mockLogger = loggingSystemMock.createLogger();
    deleteSLO = new DeleteSLO(
      mockRepository,
      mockTransformManager,
      mockSummaryTransformManager,
      mockScopedClusterClient,
      mockRulesClient,
      mockLogger
    );
  });

  describe('happy path', () => {
    it('removes all resources associated to the slo', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      mockRepository.findById.mockResolvedValueOnce(slo);

      await deleteSLO.execute(slo.id);

      expect(mockRepository.findById).toMatchSnapshot();
      expect(mockSummaryTransformManager.uninstall).toMatchSnapshot();
      expect(mockTransformManager.uninstall).toMatchSnapshot();
      expect(mockScopedClusterClient.asSecondaryAuthUser.ingest.deletePipeline).toMatchSnapshot();
      expect(mockScopedClusterClient.asCurrentUser.deleteByQuery).toMatchSnapshot();
      expect(mockRulesClient.bulkDeleteRules).toMatchSnapshot();
      expect(mockRepository.deleteById).toMatchSnapshot();
    });
  });

  describe('deleteAssociatedRules', () => {
    it('does not log a warning when bulkDeleteRules throws because no rules matched', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockRulesClient.bulkDeleteRules.mockRejectedValueOnce(
        Boom.badRequest('No rules found for bulk delete')
      );

      await expect(deleteSLO.execute(slo.id)).resolves.not.toThrow();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('logs a warning when bulkDeleteRules throws for any other reason', async () => {
      const slo = createSLO({
        id: 'irrelevant',
        indicator: createAPMTransactionErrorRateIndicator(),
      });
      mockRepository.findById.mockResolvedValueOnce(slo);
      mockRulesClient.bulkDeleteRules.mockRejectedValueOnce(new Error('unexpected failure'));

      await expect(deleteSLO.execute(slo.id)).resolves.not.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to delete associated rules for SLO.',
        expect.objectContaining({
          labels: expect.objectContaining({ slo_id: slo.id, error_type: 'cleanup_failed' }),
        })
      );
    });
  });
});

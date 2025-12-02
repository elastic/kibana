/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/onechat-common';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getRiskIndex } from '../../../common/search_strategy/security_solution/risk_score/common';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { entityRiskScoreTool } from './entity_risk_score_tool';

jest.mock('../../lib/entity_analytics/risk_score/get_risk_score', () => ({
  createGetRiskScores: jest.fn(() => jest.fn()),
}));

describe('entityRiskScoreTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityRiskScoreTool(mockCore);

  beforeEach(() => {
    jest.clearAllMocks();
    setupMockCoreStartServices(mockCore, mockEsClient);
  });

  describe('schema', () => {
    it('validates correct schema', () => {
      const validInput = {
        identifierType: 'host',
        identifier: 'hostname-1',
      };

      const result = tool.schema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('rejects invalid identifierType', () => {
      const invalidInput = {
        identifierType: 'invalid',
        identifier: 'hostname-1',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects empty identifier', () => {
      const invalidInput = {
        identifierType: 'host',
        identifier: '',
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('availability', () => {
    it('returns available when risk index exists', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValue(true);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('available');
      expect(mockEsClient.asInternalUser.indices.exists).toHaveBeenCalledWith({
        index: getRiskIndex('default', true),
      });
    });

    it('returns unavailable when risk index does not exist', async () => {
      mockEsClient.asInternalUser.indices.exists.mockResolvedValue(false);

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('Risk score index does not exist for this space');
    });

    it('returns unavailable when index check throws error', async () => {
      mockEsClient.asInternalUser.indices.exists.mockRejectedValue(new Error('ES error'));

      const result = await tool.availability!.handler(
        createToolAvailabilityContext(mockRequest, 'default')
      );

      expect(result.status).toBe('unavailable');
      expect(result.reason).toContain('Failed to check risk score index availability');
    });
  });

  describe('handler', () => {
    const { createGetRiskScores } = require('../../lib/entity_analytics/risk_score/get_risk_score');

    beforeEach(() => {
      createGetRiskScores.mockReturnValue(jest.fn());
    });

    it('successfully fetches risk score with valid identifierType and identifier', async () => {
      const mockGetRiskScores = jest.fn().mockResolvedValue([
        {
          id: 'risk-1',
          calculated_score_norm: 75,
          inputs: [
            {
              id: 'alert-1',
              risk_score: 50,
              contribution_score: 25,
              category: 'alerts',
            },
          ],
        },
      ]);
      createGetRiskScores.mockReturnValue(mockGetRiskScores);

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [
            {
              _id: 'alert-1',
              _index: 'test-index',
              _source: { 'kibana.alert.rule.name': 'Test Rule' },
            },
          ],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = await tool.handler(
        { identifierType: 'host', identifier: 'hostname-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      if (result.results[0].type === ToolResultType.other) {
        expect(result.results[0].data).toHaveProperty('riskScore');
      }
      expect(mockGetRiskScores).toHaveBeenCalledWith({
        entityType: 'host',
        entityIdentifier: 'hostname-1',
        pagination: { querySize: 1, cursorStart: 0 },
      });
    });

    it('returns error when no risk score found', async () => {
      const mockGetRiskScores = jest.fn().mockResolvedValue([]);
      createGetRiskScores.mockReturnValue(mockGetRiskScores);

      const result = await tool.handler(
        { identifierType: 'user', identifier: 'username-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No risk score found');
    });

    it('enhances inputs with alert data', async () => {
      const mockGetRiskScores = jest.fn().mockResolvedValue([
        {
          id: 'risk-1',
          calculated_score_norm: 75,
          inputs: [
            {
              id: 'alert-1',
              risk_score: 50,
              contribution_score: 25,
              category: 'alerts',
            },
          ],
        },
      ]);
      createGetRiskScores.mockReturnValue(mockGetRiskScores);

      const alertData = { 'kibana.alert.rule.name': 'Test Rule' };
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [{ _id: 'alert-1', _index: 'test-index', _source: alertData }],
          total: { value: 1, relation: 'eq' },
        },
      });

      const result = await tool.handler(
        { identifierType: 'host', identifier: 'hostname-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.type).toBe(ToolResultType.other);
      const riskScore = otherResult.data.riskScore as {
        inputs: Array<{ alert_contribution?: unknown }>;
      };
      expect(riskScore.inputs[0].alert_contribution).toEqual(alertData);
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: `${DEFAULT_ALERTS_INDEX}-default`,
          _source: expect.any(Array),
        })
      );
    });

    it('handles ES client failures', async () => {
      const mockGetRiskScores = jest.fn().mockRejectedValue(new Error('ES error'));
      createGetRiskScores.mockReturnValue(mockGetRiskScores);

      const result = await tool.handler(
        { identifierType: 'host', identifier: 'hostname-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Error fetching risk score');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

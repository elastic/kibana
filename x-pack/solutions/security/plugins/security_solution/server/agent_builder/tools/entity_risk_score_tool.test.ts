/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolResultType, type ErrorResult, type OtherResult } from '@kbn/agent-builder-common';
import type { ToolHandlerStandardReturn } from '@kbn/agent-builder-server/tools';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import { getRiskIndex } from '../../../common/search_strategy/security_solution/risk_score/common';
import {
  createToolAvailabilityContext,
  createToolHandlerContext,
  createToolTestMocks,
  setupMockCoreStartServices,
} from '../__mocks__/test_helpers';
import { entityRiskScoreTool } from './entity_risk_score_tool';
import { createGetRiskScores } from '../../lib/entity_analytics/risk_score/get_risk_score';

jest.mock('../../lib/entity_analytics/risk_score/get_risk_score');

const mockCreateGetRiskScores = createGetRiskScores as jest.Mock;

describe('entityRiskScoreTool', () => {
  const { mockCore, mockLogger, mockEsClient, mockRequest } = createToolTestMocks();
  const tool = entityRiskScoreTool(mockCore, mockLogger);

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

    it('validates schema with optional limit parameter', () => {
      const validInput = {
        identifierType: 'user',
        identifier: '*',
        limit: 5,
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

    it('rejects limit below minimum', () => {
      const invalidInput = {
        identifierType: 'host',
        identifier: '*',
        limit: 0,
      };

      const result = tool.schema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('rejects limit above maximum', () => {
      const invalidInput = {
        identifierType: 'host',
        identifier: '*',
        limit: 101,
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
    beforeEach(() => {
      mockCreateGetRiskScores.mockReturnValue(jest.fn());
    });

    it('passes handler context spaceId into createGetRiskScores', async () => {
      const mockGetRiskScores = jest.fn().mockResolvedValue([
        {
          '@timestamp': '2023-01-01T00:00:00Z',
          id_field: 'host.name',
          id_value: 'hostname-1',
          calculated_score_norm: 75,
          calculated_level: 'High',
          calculated_score: 150,
          notes: [],
          inputs: [],
        },
      ]);
      mockCreateGetRiskScores.mockReturnValue(mockGetRiskScores);

      await tool.handler(
        { identifierType: 'host', identifier: 'hostname-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger, { spaceId: 'custom-space' })
      );

      expect(mockCreateGetRiskScores).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'custom-space' })
      );
    });

    it('successfully fetches risk score with valid identifierType and identifier', async () => {
      const mockGetRiskScores = jest.fn().mockResolvedValue([
        {
          '@timestamp': '2023-01-01T00:00:00Z',
          id_field: 'host.name',
          id_value: 'hostname-1',
          calculated_score_norm: 75,
          calculated_level: 'High',
          calculated_score: 150,
          category_1_score: 75,
          category_1_count: 5,
          notes: [],
          inputs: [
            {
              id: 'alert-1',
              risk_score: 50,
              contribution_score: 25,
              category: 'category_1',
            },
          ],
        },
      ]);
      mockCreateGetRiskScores.mockReturnValue(mockGetRiskScores);

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

      const result = (await tool.handler(
        { identifierType: 'host', identifier: 'hostname-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('riskScore');
      const riskScore = (otherResult.data as { riskScore: Record<string, unknown> }).riskScore;
      // Verify calculated_score_norm is prioritized (first field)
      expect(Object.keys(riskScore)[0]).toBe('calculated_score_norm');
      expect(riskScore.calculated_score_norm).toBe(75);
      // Verify category scores/counts are NOT included
      expect(riskScore).not.toHaveProperty('category_1_score');
      expect(riskScore).not.toHaveProperty('category_1_count');
      expect(mockGetRiskScores).toHaveBeenCalledWith({
        entityType: 'host',
        entityIdentifier: 'hostname-1',
        pagination: { querySize: 1, cursorStart: 0 },
      });
    });

    it('returns error when no risk score found', async () => {
      const mockGetRiskScores = jest.fn().mockResolvedValue([]);
      mockCreateGetRiskScores.mockReturnValue(mockGetRiskScores);

      const result = (await tool.handler(
        { identifierType: 'user', identifier: 'username-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No risk score found');
    });

    it('enhances inputs with alert data', async () => {
      const mockGetRiskScores = jest.fn().mockResolvedValue([
        {
          '@timestamp': '2023-01-01T00:00:00Z',
          id_field: 'host.name',
          id_value: 'hostname-1',
          calculated_score_norm: 75,
          calculated_level: 'High',
          calculated_score: 150,
          category_1_score: 75,
          category_1_count: 5,
          notes: [],
          inputs: [
            {
              id: 'alert-1',
              risk_score: 50,
              contribution_score: 25,
              category: 'category_1',
            },
          ],
        },
      ]);
      mockCreateGetRiskScores.mockReturnValue(mockGetRiskScores);

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

      const result = (await tool.handler(
        { identifierType: 'host', identifier: 'hostname-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

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

    it('handles wildcard query with identifier "*"', async () => {
      const mockRiskScores = [
        {
          '@timestamp': '2023-01-01T00:00:00Z',
          id_field: 'user.name',
          id_value: 'user1',
          calculated_score_norm: 90,
          calculated_level: 'Critical',
          calculated_score: 200,
          category_1_score: 90,
          category_1_count: 10,
          notes: [],
          inputs: [],
        },
        {
          '@timestamp': '2023-01-01T00:00:00Z',
          id_field: 'user.name',
          id_value: 'user2',
          calculated_score_norm: 75,
          calculated_level: 'High',
          calculated_score: 150,
          category_1_score: 75,
          category_1_count: 5,
          notes: [],
          inputs: [],
        },
      ];

      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: mockRiskScores.map((score) => ({
            _id: `risk-${score.id_value}`,
            _index: 'test-index',
            _source: {
              user: {
                name: score.id_value,
                risk: score,
              },
            },
          })),
          total: { value: 2, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { identifierType: 'user', identifier: '*', limit: 10 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe(ToolResultType.other);
      const otherResult = result.results[0] as OtherResult;
      expect(otherResult.data).toHaveProperty('riskScores');
      const riskScores = (otherResult.data as { riskScores: Array<Record<string, unknown>> })
        .riskScores;
      expect(riskScores).toHaveLength(2);
      // Verify calculated_score_norm is prioritized (first field)
      expect(Object.keys(riskScores[0])[0]).toBe('calculated_score_norm');
      expect(riskScores[0].calculated_score_norm).toBe(90);
      // Verify category scores/counts are NOT included
      expect(riskScores[0]).not.toHaveProperty('category_1_score');
      expect(riskScores[0]).not.toHaveProperty('category_1_count');
      // Verify inputs are NOT included
      expect(riskScores[0]).not.toHaveProperty('inputs');
      // Verify calculated_score is NOT included (user removed it)
      expect(riskScores[0]).not.toHaveProperty('calculated_score');
      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: getRiskIndex('default', true),
          size: 10,
          sort: expect.arrayContaining([
            expect.objectContaining({
              'user.risk.calculated_score_norm': expect.objectContaining({ order: 'desc' }),
            }),
          ]),
        })
      );
    });

    it('handles wildcard query with custom limit', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      });

      await tool.handler(
        { identifierType: 'host', identifier: '*', limit: 5 },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      );

      expect(mockEsClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 5,
        })
      );
    });

    it('returns error when wildcard query finds no results', async () => {
      mockEsClient.asCurrentUser.search.mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        hits: {
          hits: [],
          total: { value: 0, relation: 'eq' },
        },
      });

      const result = (await tool.handler(
        { identifierType: 'user', identifier: '*' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('No risk scores found for user entities');
    });

    it('handles ES client failures', async () => {
      const mockGetRiskScores = jest.fn().mockRejectedValue(new Error('ES error'));
      mockCreateGetRiskScores.mockReturnValue(mockGetRiskScores);

      const result = (await tool.handler(
        { identifierType: 'host', identifier: 'hostname-1' },
        createToolHandlerContext(mockRequest, mockEsClient, mockLogger)
      )) as ToolHandlerStandardReturn;

      expect(result.results).toHaveLength(1);
      const errorResult = result.results[0] as ErrorResult;
      expect(errorResult.type).toBe(ToolResultType.error);
      expect(errorResult.data.message).toContain('Error fetching risk score');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});

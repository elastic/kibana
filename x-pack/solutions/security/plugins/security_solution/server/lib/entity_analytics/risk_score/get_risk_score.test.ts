/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGetRiskScores } from './get_risk_score';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { EntityType } from '../../../../common/search_strategy/security_solution';

describe('createGetRiskScores', () => {
  const logger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
  } as unknown as Logger;
  const esClient = {
    search: jest.fn(),
  } as unknown as ElasticsearchClient;
  const spaceId = 'default';

  const entityType = EntityType.host;
  const entityIdentifier = 'host-1';
  const pagination = { querySize: 10, cursorStart: 0 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should build the query and call esClient.search', async () => {
    const riskScore = { id: '1', score: 50 };
    const mockResponse = {
      hits: {
        hits: [{ _source: { [entityType]: { risk: riskScore } } }],
      },
    };
    (esClient.search as jest.Mock).mockResolvedValue(mockResponse);

    const getRiskScores = createGetRiskScores({ logger, esClient, spaceId });
    const result = await getRiskScores({ entityType, entityIdentifier, pagination });

    expect(esClient.search).toHaveBeenCalled();
    expect(result).toEqual([riskScore]);
  });

  it('should filter out hits without _source', async () => {
    const riskScore = { id: '1', score: 51 };
    const mockResponse = {
      hits: {
        hits: [{ _source: { [entityType]: { risk: riskScore } } }, { not_source: true }],
      },
    };
    (esClient.search as jest.Mock).mockResolvedValue(mockResponse);

    const getRiskScores = createGetRiskScores({ logger, esClient, spaceId });
    const result = await getRiskScores({ entityType, entityIdentifier, pagination });

    expect(result).toEqual([riskScore]);
  });

  it('should handle empty hits', async () => {
    const mockResponse = {
      hits: {
        hits: [],
      },
    };
    (esClient.search as jest.Mock).mockResolvedValue(mockResponse);

    const getRiskScores = createGetRiskScores({ logger, esClient, spaceId });
    const result = await getRiskScores({ entityType, entityIdentifier, pagination });

    expect(result).toEqual([]);
  });
});

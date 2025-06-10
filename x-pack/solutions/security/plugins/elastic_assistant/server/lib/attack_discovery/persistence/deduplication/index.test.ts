/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { deduplicateAttackDiscoveries } from '.';
import { mockAttackDiscoveries } from '../../evaluation/__mocks__/mock_attack_discoveries';
import { generateAttackDiscoveryAlertUuid } from '../transforms/transform_to_alert_documents';

jest.mock('../transforms/transform_to_alert_documents', () => ({
  ...jest.requireActual('../transforms/transform_to_alert_documents'),
  generateAttackDiscoveryAlertUuid: jest.fn(),
}));

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();

describe('deduplicateAttackDiscoveries', () => {
  const spaceId = 'test-space';
  const indexPattern = '.test.alerts-*,.adhoc.alerts-*';
  const uuid1 = 'test-uuid-1';
  const uuid2 = 'test-uuid-2';
  const [attack1, attack2] = mockAttackDiscoveries;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.search.mockResponse({ hits: { hits: [] } } as unknown as estypes.SearchResponse);
    (generateAttackDiscoveryAlertUuid as jest.Mock).mockImplementation(({ attackDiscovery }) => {
      if (attackDiscovery === attack1) return uuid1;
      if (attackDiscovery === attack2) return uuid2;
      return 'unknown-uuid';
    });
  });

  it('should return empty array if no attack discoveries passed to the function', async () => {
    const result = await deduplicateAttackDiscoveries({
      attackDiscoveries: [],
      esClient: mockEsClient,
      indexPattern,
      logger: mockLogger,
      spaceId,
    });

    expect(result).toEqual([]);
  });

  it('should return all discoveries if none are duplicates', async () => {
    const result = await deduplicateAttackDiscoveries({
      attackDiscoveries: mockAttackDiscoveries,
      esClient: mockEsClient,
      indexPattern,
      logger: mockLogger,
      spaceId,
    });
    expect(result).toEqual(mockAttackDiscoveries);
  });

  it('should filter out all discoveries if all are duplicates', async () => {
    mockEsClient.search.mockResponse({
      hits: {
        hits: [
          { _source: { 'kibana.alert.instance.id': uuid1 } },
          { _source: { 'kibana.alert.instance.id': uuid2 } },
        ],
      },
    } as unknown as estypes.SearchResponse);
    const result = await deduplicateAttackDiscoveries({
      attackDiscoveries: mockAttackDiscoveries,
      esClient: mockEsClient,
      indexPattern,
      logger: mockLogger,
      spaceId,
    });
    expect(result).toEqual([]);
  });

  it('should filter out only duplicates and keep new discoveries', async () => {
    mockEsClient.search.mockResponse({
      hits: {
        hits: [{ _source: { 'kibana.alert.instance.id': uuid2 } }],
      },
    } as unknown as estypes.SearchResponse);
    const result = await deduplicateAttackDiscoveries({
      attackDiscoveries: [attack1, attack2],
      esClient: mockEsClient,
      indexPattern,
      logger: mockLogger,
      spaceId,
    });
    expect(result).toEqual([attack1]);
  });

  it('should handle ES hits with missing _source gracefully', async () => {
    mockEsClient.search.mockResponse({
      hits: {
        hits: [{ _id: 'foo' }],
      },
    } as unknown as estypes.SearchResponse);
    const result = await deduplicateAttackDiscoveries({
      attackDiscoveries: [attack1],
      esClient: mockEsClient,
      indexPattern,
      logger: mockLogger,
      spaceId,
    });
    expect(result).toEqual([attack1]);
  });

  it('should log when duplicates are found', async () => {
    mockEsClient.search.mockResponse({
      hits: {
        hits: [{ _source: { 'kibana.alert.instance.id': uuid1 } }],
      },
    } as unknown as estypes.SearchResponse);
    await deduplicateAttackDiscoveries({
      attackDiscoveries: mockAttackDiscoveries,
      esClient: mockEsClient,
      indexPattern,
      logger: mockLogger,
      spaceId,
    });
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Found 1 duplicate alert(s), skipping report for those.'
    );
  });
});

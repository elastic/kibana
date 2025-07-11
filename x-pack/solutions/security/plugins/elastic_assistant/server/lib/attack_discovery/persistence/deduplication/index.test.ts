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
import { generateAttackDiscoveryAlertHash } from '../transforms/transform_to_alert_documents';

jest.mock('../transforms/transform_to_alert_documents', () => ({
  ...jest.requireActual('../transforms/transform_to_alert_documents'),
  generateAttackDiscoveryAlertHash: jest.fn(),
}));

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();

describe('deduplicateAttackDiscoveries', () => {
  const uuid1 = 'test-uuid-1';
  const uuid2 = 'test-uuid-2';
  const [attack1, attack2] = mockAttackDiscoveries;
  const defaultProps = {
    attackDiscoveries: mockAttackDiscoveries,
    connectorId: 'test-connector-1',
    esClient: mockEsClient,
    indexPattern: '.test.alerts-*,.adhoc.alerts-*',
    isSchedule: false,
    logger: mockLogger,
    ownerId: 'test-owner-1',
    replacements: undefined,
    spaceId: 'test-space',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.search.mockResponse({ hits: { hits: [] } } as unknown as estypes.SearchResponse);
    (generateAttackDiscoveryAlertHash as jest.Mock).mockImplementation(({ attackDiscovery }) => {
      if (attackDiscovery === attack1) return uuid1;
      if (attackDiscovery === attack2) return uuid2;
      return 'unknown-uuid';
    });
  });

  it('should return empty array if no attack discoveries passed to the function', async () => {
    const result = await deduplicateAttackDiscoveries({ ...defaultProps, attackDiscoveries: [] });

    expect(result).toEqual([]);
  });

  it('should return all discoveries if none are duplicates', async () => {
    const result = await deduplicateAttackDiscoveries(defaultProps);
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
    const result = await deduplicateAttackDiscoveries(defaultProps);
    expect(result).toEqual([]);
  });

  it('should filter out only duplicates and keep new discoveries', async () => {
    mockEsClient.search.mockResponse({
      hits: {
        hits: [{ _source: { 'kibana.alert.instance.id': uuid2 } }],
      },
    } as unknown as estypes.SearchResponse);
    const result = await deduplicateAttackDiscoveries({
      ...defaultProps,
      attackDiscoveries: [attack1, attack2],
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
      ...defaultProps,
      attackDiscoveries: [attack1],
    });
    expect(result).toEqual([attack1]);
  });

  it('should log when duplicates are found for ad-hoc run', async () => {
    mockEsClient.search.mockResponse({
      hits: {
        hits: [{ _source: { 'kibana.alert.instance.id': uuid1 } }],
      },
    } as unknown as estypes.SearchResponse);
    await deduplicateAttackDiscoveries(defaultProps);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Ad-hoc Attack Discovery: Found 1 duplicate alert(s), skipping report for those.'
    );
    expect((mockLogger.debug as jest.Mock).mock.calls[0][0]()).toBe(
      `Ad-hoc Attack Discovery: Duplicated alerts:\n ${JSON.stringify([uuid1].sort(), null, 2)}`
    );
  });

  it('should log when duplicates are found for scheduled run', async () => {
    mockEsClient.search.mockResponse({
      hits: {
        hits: [{ _source: { 'kibana.alert.instance.id': uuid1 } }],
      },
    } as unknown as estypes.SearchResponse);
    await deduplicateAttackDiscoveries({ ...defaultProps, isSchedule: true });
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Attack Discovery Schedule: Found 1 duplicate alert(s), skipping report for those.'
    );
    expect((mockLogger.debug as jest.Mock).mock.calls[0][0]()).toBe(
      `Attack Discovery Schedule: Duplicated alerts:\n ${JSON.stringify([uuid1].sort(), null, 2)}`
    );
  });
});

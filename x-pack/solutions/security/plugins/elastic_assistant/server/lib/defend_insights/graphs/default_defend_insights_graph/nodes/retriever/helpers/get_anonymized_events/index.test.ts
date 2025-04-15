/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  DefendInsightType,
  getRawDataOrDefault,
  transformRawData,
} from '@kbn/elastic-assistant-common';

import { mockAnonymizationFields } from '../../../../mock/mock_anonymization_fields';
import { mockAnonymizedEventsReplacements } from '../../../../mock/mock_anonymized_events';
import { getAnonymizedEvents } from '.';

jest.mock('@kbn/elastic-assistant-common', () => ({
  ...jest.requireActual('@kbn/elastic-assistant-common'),
  getRawDataOrDefault: jest.fn(),
  transformRawData: jest.fn(),
}));

const createMockEsClient = () => {
  return {
    search: jest.fn(),
  } as unknown as jest.Mocked<ElasticsearchClient>;
};

const mockRawData: Record<string, unknown[]> = {
  field1: ['value1'],
  field2: ['value2'],
};

describe('getAnonymizedEvents', () => {
  const mockEsClient = createMockEsClient();
  const mockedGetRawDataOrDefault = getRawDataOrDefault as jest.MockedFunction<
    typeof getRawDataOrDefault
  >;
  const mockedTransformRawData = transformRawData as jest.MockedFunction<typeof transformRawData>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.search.mockResolvedValue({
      aggregations: {
        unique_process_executable: {
          buckets: [
            {
              key: 'process1',
              doc_count: 1,
              latest_event: {
                hits: {
                  hits: [
                    {
                      _id: 'event1',
                      _source: {
                        agent: { id: 'agent1' },
                        process: { executable: 'executable1' },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    } as unknown as SearchResponse);
    mockedGetRawDataOrDefault.mockReturnValue(mockRawData);
    mockedTransformRawData.mockReturnValue('transformed data');
  });

  it('should return an empty array when insightType is null', async () => {
    const result = await getAnonymizedEvents({
      insightType: null as unknown as DefendInsightType,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
    expect(mockEsClient.search).not.toHaveBeenCalled();
  });

  it('should properly handle missing aggregations in response', async () => {
    mockEsClient.search.mockResolvedValue({} as SearchResponse);

    const result = await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });

  it('should properly handle required parameters', async () => {
    const result = await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
    });

    expect(mockEsClient.search).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should call getRawDataOrDefault with correct fields', async () => {
    await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
    });

    expect(mockedGetRawDataOrDefault).toHaveBeenCalledWith({
      _id: ['event1'],
      'agent.id': ['agent1'],
      'process.executable': ['executable1'],
    });
  });

  it('should handle anonymizationFields when provided', async () => {
    const onNewReplacements = jest.fn();

    await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
      anonymizationFields: mockAnonymizationFields,
      onNewReplacements,
    });

    expect(mockedTransformRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        anonymizationFields: mockAnonymizationFields,
        rawData: mockRawData,
      })
    );
  });

  it('should use existing replacements when provided', async () => {
    const onNewReplacements = jest.fn();

    await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
      anonymizationFields: mockAnonymizationFields,
      replacements: mockAnonymizedEventsReplacements,
      onNewReplacements,
    });

    expect(mockedTransformRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        currentReplacements: expect.objectContaining(mockAnonymizedEventsReplacements),
      })
    );
  });

  it('should handle date range parameters', async () => {
    const start = 'now-24h';
    const end = 'now';

    await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
      start,
      end,
    });

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            must: expect.arrayContaining([
              {
                range: {
                  '@timestamp': {
                    gte: start,
                    lte: end,
                  },
                },
              },
            ]),
          },
        },
      })
    );
  });

  it('should handle size parameter', async () => {
    const size = 5;

    await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
      size,
    });

    expect(mockEsClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        aggs: {
          unique_process_executable: {
            terms: {
              field: 'process.executable',
              size,
            },
            aggs: {
              latest_event: {
                top_hits: {
                  _source: ['_id', 'agent.id', 'process.executable'],
                  size: 1,
                  sort: [{ '@timestamp': { order: 'desc' } }],
                },
              },
            },
          },
        },
      })
    );
  });

  it('should handle ES search errors', async () => {
    const error = new Error('ES Search failed');
    mockEsClient.search.mockRejectedValue(error);

    await expect(
      getAnonymizedEvents({
        insightType: DefendInsightType.Enum.incompatible_antivirus,
        endpointIds: ['test-endpoint'],
        esClient: mockEsClient,
      })
    ).rejects.toThrow(error);
  });

  it('should handle empty search results', async () => {
    mockEsClient.search.mockResolvedValue({
      aggregations: {
        unique_process_executable: {
          buckets: [],
        },
      },
    } as unknown as SearchResponse);

    const result = await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
  });

  it('should properly transform fields using anonymization rules', async () => {
    const transformedValue = 'anonymized data';
    mockedTransformRawData.mockReturnValue(transformedValue);

    const result = await getAnonymizedEvents({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      endpointIds: ['test-endpoint'],
      esClient: mockEsClient,
      anonymizationFields: mockAnonymizationFields,
    });

    expect(result).toEqual(expect.arrayContaining([transformedValue]));
  });
});

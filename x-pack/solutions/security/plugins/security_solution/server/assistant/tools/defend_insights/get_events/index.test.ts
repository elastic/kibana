/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { DefendInsightType, transformRawData } from '@kbn/elastic-assistant-common';

import { InvalidDefendInsightTypeError } from '../errors';
import { getFileEventsQuery } from './get_file_events_query';
import { getAnonymizedEvents } from '.';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

jest.mock('@kbn/elastic-assistant-common', () => {
  const originalModule = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...originalModule,
    transformRawData: jest.fn(),
  };
});

jest.mock('./get_file_events_query', () => ({
  getFileEventsQuery: jest.fn(),
}));

describe('getAnonymizedEvents', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  const mockAggregations = {
    unique_process_executable: {
      buckets: [
        {
          key: 'process1',
          doc_count: 10,
          latest_event: {
            hits: {
              hits: [
                {
                  _id: 'event1',
                  _source: {
                    agent: { id: 'agent1' },
                    process: { executable: 'process1' },
                  },
                },
              ],
            },
          },
        },
        {
          key: 'process2',
          doc_count: 5,
          latest_event: {
            hits: {
              hits: [
                {
                  _id: 'event2',
                  _source: {
                    agent: { id: 'agent2' },
                    process: { executable: 'process2' },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };

  beforeEach(() => {
    (getFileEventsQuery as jest.Mock).mockReturnValue({ index: 'test-index', body: {} });
    (transformRawData as jest.Mock).mockImplementation(
      ({ rawData }) => `anonymized_${Object.values(rawData)[0]}`
    );
    mockEsClient = {
      search: jest.fn().mockResolvedValue({
        took: 1,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        aggregations: mockAggregations,
      }),
    } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return anonymized events successfully from aggregations', async () => {
    const result = await getAnonymizedEvents({
      endpointIds: ['endpoint1'],
      type: DefendInsightType.Enum.incompatible_antivirus,
      esClient: mockEsClient,
    });

    expect(result).toEqual(['anonymized_event1', 'anonymized_event2']);
    expect(getFileEventsQuery).toHaveBeenCalledWith({ endpointIds: ['endpoint1'] });
    expect(mockEsClient.search).toHaveBeenCalledWith({ index: 'test-index', body: {} });
    expect(transformRawData).toHaveBeenCalledTimes(2);
    expect(transformRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        rawData: expect.objectContaining({
          _id: ['event1'],
        }),
      })
    );
  });

  it('should map aggregation response correctly into fileEvents structure', async () => {
    await getAnonymizedEvents({
      endpointIds: ['endpoint1'],
      type: DefendInsightType.Enum.incompatible_antivirus,
      esClient: mockEsClient,
    });

    expect(mockEsClient.search).toHaveBeenCalledWith({ index: 'test-index', body: {} });

    expect(transformRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        rawData: {
          _id: ['event1'],
          'agent.id': ['agent1'],
          'process.executable': ['process1'],
        },
      })
    );

    expect(transformRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        rawData: {
          _id: ['event2'],
          'agent.id': ['agent2'],
          'process.executable': ['process2'],
        },
      })
    );
  });

  it('should throw InvalidDefendInsightTypeError for invalid type', async () => {
    await expect(
      getAnonymizedEvents({
        endpointIds: ['endpoint1'],
        type: 'invalid_type' as DefendInsightType,
        esClient: mockEsClient,
      })
    ).rejects.toThrow(InvalidDefendInsightTypeError);
  });

  it('should handle empty aggregation response gracefully', async () => {
    mockEsClient.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      aggregations: {
        unique_process_executable: {
          buckets: [],
        },
      },
    } as unknown as SearchResponse);

    const result = await getAnonymizedEvents({
      endpointIds: ['endpoint1'],
      type: DefendInsightType.Enum.incompatible_antivirus,
      esClient: mockEsClient,
    });

    expect(result).toEqual([]);
    expect(transformRawData).not.toHaveBeenCalled();
  });
});

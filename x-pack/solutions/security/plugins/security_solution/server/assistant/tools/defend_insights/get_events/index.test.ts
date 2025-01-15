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

  const mockHits = [
    { _index: 'test-index', fields: { field1: ['value1'] } },
    { _index: 'test-index', fields: { field2: ['value2'] } },
  ];

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
        hits: {
          hits: mockHits,
        },
      }),
    } as unknown as jest.Mocked<ElasticsearchClient>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return anonymized events successfully', async () => {
    const result = await getAnonymizedEvents({
      endpointIds: ['endpoint1'],
      type: DefendInsightType.Enum.incompatible_antivirus,
      esClient: mockEsClient,
    });

    expect(result).toEqual(['anonymized_value1', 'anonymized_value2']);
    expect(getFileEventsQuery).toHaveBeenCalledWith({ endpointIds: ['endpoint1'] });
    expect(mockEsClient.search).toHaveBeenCalledWith({ index: 'test-index', body: {} });
    expect(transformRawData).toHaveBeenCalledTimes(2);
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
});

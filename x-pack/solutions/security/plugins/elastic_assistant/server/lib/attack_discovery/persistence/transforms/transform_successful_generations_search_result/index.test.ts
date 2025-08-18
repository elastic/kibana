/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregate } from '@elastic/elasticsearch/lib/api/types';
import { loggerMock } from '@kbn/logging-mocks';

import { transformSuccessfulGenerationsSearchResult } from '.';

interface RawResponse {
  aggregations: AggregationsAggregate | undefined;
}

const mockRawResponse: RawResponse = {
  aggregations: {
    successfull_generations_by_connector_id: {
      buckets: [
        {
          key: 'gpt41Azure',
          doc_count: 2,
          event_actions: {
            buckets: [
              {
                key: 'generation-succeeded',
                doc_count: 2,
              },
            ],
          },
          successful_generations: {
            value: 2,
          },
          avg_event_duration_nanoseconds: {
            value: 36714000000,
          },
          latest_successfull_generation: {
            value: 1751061769473,
            value_as_string: '2025-06-27T22:02:49.473Z',
          },
        },
      ],
    },
  },
};

describe('transformSuccessfulGenerationsSearchResult', () => {
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns transformed successful generations metadata when the raw response is valid', () => {
    const result = transformSuccessfulGenerationsSearchResult({
      logger: mockLogger,
      rawResponse: mockRawResponse,
    });

    expect(result).toEqual({
      gpt41Azure: {
        averageSuccessfulDurationNanoseconds: 36714000000,
        successfulGenerations: 2,
      },
    });
  });

  it('returns transformed metadata with multiple connectors', () => {
    const multiConnectorResponse: RawResponse = {
      aggregations: {
        successfull_generations_by_connector_id: {
          buckets: [
            {
              key: 'gpt41Azure',
              doc_count: 2,
              event_actions: {
                buckets: [
                  {
                    key: 'generation-succeeded',
                    doc_count: 2,
                  },
                ],
              },
              successful_generations: {
                value: 2,
              },
              avg_event_duration_nanoseconds: {
                value: 36714000000,
              },
              latest_successfull_generation: {
                value: 1751061769473,
                value_as_string: '2025-06-27T22:02:49.473Z',
              },
            },
            {
              key: 'claude3',
              doc_count: 5,
              event_actions: {
                buckets: [
                  {
                    key: 'generation-succeeded',
                    doc_count: 5,
                  },
                ],
              },
              successful_generations: {
                value: 5,
              },
              avg_event_duration_nanoseconds: {
                value: 25000000000,
              },
              latest_successfull_generation: {
                value: 1751061869473,
                value_as_string: '2025-06-27T22:04:29.473Z',
              },
            },
          ],
        },
      },
    };

    const result = transformSuccessfulGenerationsSearchResult({
      logger: mockLogger,
      rawResponse: multiConnectorResponse,
    });

    expect(result).toEqual({
      gpt41Azure: {
        averageSuccessfulDurationNanoseconds: 36714000000,
        successfulGenerations: 2,
      },
      claude3: {
        averageSuccessfulDurationNanoseconds: 25000000000,
        successfulGenerations: 5,
      },
    });
  });

  it('returns transformed metadata when average duration is null', () => {
    const responseWithNullDuration: RawResponse = {
      aggregations: {
        successfull_generations_by_connector_id: {
          buckets: [
            {
              key: 'gpt41Azure',
              doc_count: 2,
              event_actions: {
                buckets: [
                  {
                    key: 'generation-succeeded',
                    doc_count: 2,
                  },
                ],
              },
              successful_generations: {
                value: 2,
              },
              avg_event_duration_nanoseconds: {
                value: null,
              },
              latest_successfull_generation: {
                value: 1751061769473,
                value_as_string: '2025-06-27T22:02:49.473Z',
              },
            },
          ],
        },
      },
    };

    const result = transformSuccessfulGenerationsSearchResult({
      logger: mockLogger,
      rawResponse: responseWithNullDuration,
    });

    expect(result).toEqual({
      gpt41Azure: {
        averageSuccessfulDurationNanoseconds: undefined,
        successfulGenerations: 2,
      },
    });
  });

  it('returns an empty object when the buckets array is empty', () => {
    const responseWithEmptyBuckets: RawResponse = {
      aggregations: {
        successfull_generations_by_connector_id: {
          buckets: [],
        },
      },
    };

    const result = transformSuccessfulGenerationsSearchResult({
      logger: mockLogger,
      rawResponse: responseWithEmptyBuckets,
    });

    expect(result).toEqual({});
  });

  describe('when raw response validation fails', () => {
    let invalidResponse: unknown;

    beforeEach(() => {
      invalidResponse = {
        aggregations: {
          wrong_field_name: {
            buckets: [],
          },
        },
      };
    });

    it('throws an error', () => {
      expect(() => {
        transformSuccessfulGenerationsSearchResult({
          logger: mockLogger,
          rawResponse: invalidResponse as { aggregations: AggregationsAggregate | undefined },
        });
      }).toThrow('Failed to parse search results in transformSuccessfulGenerationsSearchResult');
    });

    it('logs an error', () => {
      try {
        transformSuccessfulGenerationsSearchResult({
          logger: mockLogger,
          rawResponse: invalidResponse as { aggregations: AggregationsAggregate | undefined },
        });
      } catch (e) {
        // error expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to parse search results in transformSuccessfulGenerationsSearchResult'
        )
      );
    });
  });

  it('throws error and logs when aggregations is undefined', () => {
    const responseWithUndefinedAggregations: RawResponse = {
      aggregations: undefined,
    };

    expect(() => {
      transformSuccessfulGenerationsSearchResult({
        logger: mockLogger,
        rawResponse: responseWithUndefinedAggregations,
      });
    }).toThrow('Failed to parse search results in transformSuccessfulGenerationsSearchResult');
  });

  it('throws when the bucket structure is invalid', () => {
    const responseWithInvalidBucket = {
      aggregations: {
        successfull_generations_by_connector_id: {
          buckets: [
            {
              key: 'gpt41Azure',
              doc_count: 2,
              // Missing required fields
            },
          ],
        },
      },
    };

    expect(() => {
      transformSuccessfulGenerationsSearchResult({
        logger: mockLogger,
        rawResponse: responseWithInvalidBucket,
      });
    }).toThrow('Failed to parse search results in transformSuccessfulGenerationsSearchResult');
  });
});

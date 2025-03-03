/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { searchProcessWithIOEvents } from './io_events_route';

const TEST_PROCESS_INDEX = 'logs-endpoint.events.process*';

const getEmptyResponse = async () => {
  return {
    aggregations: {
      custom_agg: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [],
      },
    },
  };
};

const getResponse = async () => {
  return {
    aggregations: {
      custom_agg: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'mockId',
            doc_count: 1,
          },
        ],
      },
    },
  };
};

describe('io_events_route.ts', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('searchProcessWithIOEvents(client, sessionEntityId, range)', () => {
    it('should return an empty events array for a non existant entity_id', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getEmptyResponse());
      const body = await searchProcessWithIOEvents(esClient, TEST_PROCESS_INDEX, 'asdf');

      expect(body.length).toBe(0);
    });

    it('returns results for a particular session entity_id', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getResponse());

      const body = await searchProcessWithIOEvents(esClient, TEST_PROCESS_INDEX, 'mockId');

      expect(body.length).toBe(1);

      body.forEach((event) => {
        expect(event._source?.event?.action).toBe('text_output');
        expect(event._source?.event?.kind).toBe('event');
        expect(event._source?.process?.entity_id).toBe('mockId');
      });
    });

    it('takes a range', async () => {
      const esClient = elasticsearchServiceMock.createElasticsearchClient(getResponse());

      const start = '2021-11-23T15:25:04.210Z';
      const end = '2021-20-23T15:25:04.210Z';
      const body = await searchProcessWithIOEvents(esClient, TEST_PROCESS_INDEX, 'mockId', [
        start,
        end,
      ]);

      expect(body.length).toBe(1);
    });
  });
});

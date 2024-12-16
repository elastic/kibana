/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JsonObject } from '@kbn/utility-types';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { enableStreams, fetchDocument, indexDocument, putStream } from './helpers/requests';
import { FtrProviderContext } from '../../ftr_provider_context';
import { waitForDocumentInIndex } from '../../../alerting_api_integration/observability/helpers/alerting_wait_for_helpers';
import { cleanUpRootStream } from './helpers/cleanup';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const retryService = getService('retry');
  const logger = getService('log');

  describe('Enrichment', () => {
    after(async () => {
      await cleanUpRootStream(esClient);
    });

    before(async () => {
      await enableStreams(supertest);
    });

    it('Place processing steps', async () => {
      const body = {
        fields: [
          {
            name: '@timestamp',
            type: 'date',
          },
          {
            name: 'message',
            type: 'match_only_text',
          },
          {
            name: 'message2',
            type: 'match_only_text',
          },
          {
            name: 'host.name',
            type: 'keyword',
          },
          {
            name: 'log.level',
            type: 'keyword',
          },
        ],
        processing: [
          {
            config: {
              type: 'grok',
              field: 'message',
              patterns: [
                '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
              ],
            },
          } as JsonObject,
          {
            config: {
              type: 'dissect',
              field: 'message2',
              pattern: '%{log.logger} %{message3}',
            },
            condition: {
              field: 'log.level',
              operator: 'eq',
              value: 'info',
            },
          } as JsonObject,
        ],
        children: [],
      };
      const response = await putStream(supertest, 'logs', body);
      expect(response).to.have.property('acknowledged', true);
    });

    it('Index doc not matching condition', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');
      await waitForDocumentInIndex({ esClient, indexName: 'logs', retryService, logger });

      const result = await fetchDocument(esClient, 'logs', response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        inner_timestamp: '2023-01-01T00:00:10.000Z',
        message2: 'test',
        log: {
          level: 'error',
        },
      });
    });

    it('Index doc matching condition', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:11.000Z',
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');
      await waitForDocumentInIndex({
        esClient,
        indexName: 'logs',
        retryService,
        logger,
        docCountTarget: 2,
      });

      const result = await fetchDocument(esClient, 'logs', response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:11.000Z',
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
        inner_timestamp: '2023-01-01T00:00:10.000Z',
        log: {
          level: 'info',
          logger: 'mylogger',
        },
        message2: 'mylogger this is the message',
        message3: 'this is the message',
      });
    });

    it('Doc is searchable', async () => {
      const response = await esClient.search({
        index: 'logs',
        body: {
          query: {
            match: {
              message2: 'mylogger',
            },
          },
        },
      });
      expect((response.hits.total as SearchTotalHits).value).to.eql(1);
    });

    it('Non-indexed field is not searchable', async () => {
      const response = await esClient.search({
        index: 'logs',
        body: {
          query: {
            match: {
              'log.logger': 'mylogger',
            },
          },
        },
      });
      expect((response.hits.total as SearchTotalHits).value).to.eql(0);
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { WiredStreamConfigDefinition } from '@kbn/streams-schema';
import {
  deleteStream,
  enableStreams,
  fetchDocument,
  forkStream,
  indexDocument,
  putStream,
} from './helpers/requests';
import { FtrProviderContext } from '../../ftr_provider_context';
import { waitForDocumentInIndex } from '../../../alerting_api_integration/observability/helpers/alerting_wait_for_helpers';
import { cleanUpRootStream } from './helpers/cleanup';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const retryService = getService('retry');
  const logger = getService('log');

  describe('Enrichment', () => {
    before(async () => {
      await enableStreams(supertest);
      const body = {
        stream: {
          name: 'logs.nginx',
        },
        condition: {
          field: 'host.name',
          operator: 'eq',
          value: 'routeme',
        },
      };
      // We use a forked stream as processing changes cannot be made to the root stream
      await forkStream(supertest, 'logs', body);
    });

    after(async () => {
      await deleteStream(supertest, 'logs.nginx');
      await cleanUpRootStream(esClient);
      await esClient.indices.deleteDataStream({
        name: ['logs*'],
      });
    });

    it('Place processing steps', async () => {
      const body: WiredStreamConfigDefinition = {
        ingest: {
          processing: [
            {
              config: {
                grok: {
                  field: 'message',
                  patterns: [
                    '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                  ],
                },
              },
            },
            {
              config: {
                dissect: {
                  field: 'message2',
                  pattern: '%{log.logger} %{message3}',
                },
              },
              condition: {
                field: 'log.level',
                operator: 'eq',
                value: 'info',
              },
            },
          ],
          routing: [],
          wired: {
            fields: {
              '@timestamp': {
                type: 'date',
              },
              message: {
                type: 'match_only_text',
              },
              message2: {
                type: 'match_only_text',
              },
              'host.name': {
                type: 'keyword',
              },
              'log.level': {
                type: 'keyword',
              },
            },
          },
        },
      };
      const response = await putStream(supertest, 'logs.nginx', body);
      expect(response).to.have.property('acknowledged', true);
    });

    it('Index doc not matching condition', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        ['host.name']: 'routeme',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');
      const reroutedDocResponse = await waitForDocumentInIndex({
        esClient,
        indexName: 'logs.nginx',
        retryService,
        logger,
      });

      const result = await fetchDocument(
        esClient,
        'logs.nginx',
        reroutedDocResponse.hits?.hits[0]?._id!
      );
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        'host.name': 'routeme',
        inner_timestamp: '2023-01-01T00:00:10.000Z',
        message2: 'test',
        'log.level': 'error',
      });
    });

    it('Index doc matching condition', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:11.000Z',
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
        ['host.name']: 'routeme',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');
      const reroutedDocResponse = await waitForDocumentInIndex({
        esClient,
        indexName: 'logs.nginx',
        retryService,
        logger,
        docCountTarget: 2,
      });

      const result = await fetchDocument(
        esClient,
        'logs.nginx',
        reroutedDocResponse.hits?.hits[0]?._id!
      );
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:11.000Z',
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
        inner_timestamp: '2023-01-01T00:00:10.000Z',
        'host.name': 'routeme',
        'log.level': 'info',
        'log.logger': 'mylogger',
        message2: 'mylogger this is the message',
        message3: 'this is the message',
      });
    });

    it('Doc is searchable', async () => {
      const response = await esClient.search({
        index: 'logs.nginx',
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
        index: 'logs.nginx',
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { deleteStream, enableStreams, indexDocument } from './helpers/requests';
import { FtrProviderContext } from '../../ftr_provider_context';
import { waitForDocumentInIndex } from '../../../alerting_api_integration/observability/helpers/alerting_wait_for_helpers';
import { cleanUpRootStream } from './helpers/cleanup';

const streams = [
  {
    processing: [],
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
        name: 'host.name',
        type: 'keyword',
      },
      {
        name: 'log.level',
        type: 'keyword',
      },
    ],
    children: [
      {
        id: 'logs.test',
        condition: {
          and: [
            {
              field: 'numberfield',
              operator: 'gt',
              value: 15,
            },
          ],
        },
      },
      {
        id: 'logs.test2',
        condition: {
          and: [
            {
              field: 'field2',
              operator: 'eq',
              value: 'abc',
            },
          ],
        },
      },
    ],
    id: 'logs',
  },
  {
    id: 'logs.test',
    processing: [],
    fields: [],
    children: [],
  },
  {
    id: 'logs.test2',
    processing: [
      {
        config: {
          type: 'grok',
          field: 'message',
          patterns: ['%{NUMBER:numberfield}'],
        },
      },
    ],
    fields: [
      {
        name: 'numberfield',
        type: 'long',
      },
    ],
    children: [],
  },
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const retryService = getService('retry');
  const logger = getService('log');

  // An anticipated use case is that a user will want to flush a tree of streams from a config file
  describe('Flush from config file', () => {
    after(async () => {
      await deleteStream(supertest, 'logs.nginx');
      await cleanUpRootStream(esClient);
    });

    // Note: Each step is dependent on the previous
    it('Enable streams', async () => {
      await enableStreams(supertest);
    });

    it('PUTs all streams one by one without errors', async () => {
      for (const { id: streamId, ...stream } of streams) {
        const response = await supertest
          .put(`/api/streams/${streamId}`)
          .set('kbn-xsrf', 'xxx')
          .send(stream)
          .expect(200);

        expect(response.body).to.have.property('acknowledged', true);
      }
    });

    it('send data and it is handled properly', async () => {
      // send data that stays in logs
      const doc = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test',
        'log.level': 'info',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');
      await waitForDocumentInIndex({ esClient, indexName: 'logs', retryService, logger });

      // send data that lands in logs.test
      const doc2 = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test',
        numberfield: 20,
      };
      const response2 = await indexDocument(esClient, 'logs', doc2);
      expect(response2.result).to.eql('created');
      await waitForDocumentInIndex({ esClient, indexName: 'logs.test', retryService, logger });

      // send data that lands in logs.test2
      const doc3 = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: '123',
        field2: 'abc',
      };
      const response3 = await indexDocument(esClient, 'logs', doc3);
      expect(response3.result).to.eql('created');
      await waitForDocumentInIndex({ esClient, indexName: 'logs.test2', retryService, logger });
    });

    it('makes data searchable as expected', async () => {
      const query = {
        match: { numberfield: 123 },
      };
      const response = await esClient.search({ index: 'logs.test2', query });
      expect((response.hits.total as SearchTotalHits).value).to.eql(1);
    });
  });
}

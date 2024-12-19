/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { JsonObject } from '@kbn/utility-types';
import {
  deleteStream,
  enableStreams,
  fetchDocument,
  getStream,
  indexDocument,
  listStreams,
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

  describe('Classic streams', () => {
    after(async () => {
      await cleanUpRootStream(esClient);
    });

    before(async () => {
      await enableStreams(supertest);
    });

    it('Shows non-wired data streams', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, 'logs-test-default', doc);
      expect(response.result).to.eql('created');
      const streams = await listStreams(supertest);
      const classicStream = streams.streams.find(
        (stream: JsonObject) => stream.name === 'logs-test-default'
      );
      expect(classicStream).to.eql({
        name: 'logs-test-default',
        stream: {
          ingest: {
            processing: [],
            routing: [],
          },
        },
      });
    });

    it('Allows setting processing on classic streams', async () => {
      const response = await putStream(supertest, 'logs-test-default', {
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
          ],
          routing: [],
        },
      });
      expect(response).to.have.property('acknowledged', true);
      const streamBody = await getStream(supertest, 'logs-test-default');
      expect(streamBody).to.eql({
        name: 'logs-test-default',
        inherited_fields: {},
        stream: {
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
            ],
            routing: [],
          },
        },
      });
    });

    it('Executes processing on classic streams', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, 'logs-test-default', doc);
      expect(response.result).to.eql('created');
      await waitForDocumentInIndex({
        esClient,
        indexName: 'logs-test-default',
        retryService,
        logger,
        docCountTarget: 2,
      });
      const result = await fetchDocument(esClient, 'logs-test-default', response._id);
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

    it('Allows removing processing on classic streams', async () => {
      const response = await putStream(supertest, 'logs-test-default', {
        ingest: {
          processing: [],
          routing: [],
        },
      });
      expect(response).to.have.property('acknowledged', true);
    });

    it('Executes processing on classic streams after removing processing', async () => {
      const doc = {
        // default logs pipeline fills in timestamp with current date if not set
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
      };
      const response = await indexDocument(esClient, 'logs-test-default', doc);
      expect(response.result).to.eql('created');
      await waitForDocumentInIndex({
        esClient,
        indexName: 'logs-test-default',
        retryService,
        logger,
        docCountTarget: 3,
      });
      const result = await fetchDocument(esClient, 'logs-test-default', response._id);
      expect(result._source).to.eql({
        // accept any date
        '@timestamp': (result._source as { [key: string]: unknown })['@timestamp'],
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
      });
    });

    it('Allows deleting classic streams', async () => {
      await deleteStream(supertest, 'logs-test-default');
      const streams = await listStreams(supertest);
      const classicStream = streams.streams.find(
        (stream: JsonObject) => stream.name === 'logs-test-default'
      );
      expect(classicStream).to.eql(undefined);
    });
  });
}

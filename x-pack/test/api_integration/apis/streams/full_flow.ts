/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  deleteStream,
  enableStreams,
  fetchDocument,
  forkStream,
  indexDocument,
} from './helpers/requests';
import { FtrProviderContext } from '../../ftr_provider_context';
import { waitForDocumentInIndex } from '../../../alerting_api_integration/observability/helpers/alerting_wait_for_helpers';
import { cleanUpRootStream } from './helpers/cleanup';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const retryService = getService('retry');
  const logger = getService('log');

  describe('Basic functionality', () => {
    after(async () => {
      await deleteStream(supertest, 'logs.nginx');
      await cleanUpRootStream(esClient);
    });

    // Note: Each step is dependent on the previous
    describe('Full flow', () => {
      it('Enable streams', async () => {
        await enableStreams(supertest);
      });

      it('Index a JSON document to logs, should go to logs', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: JSON.stringify({
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const response = await indexDocument(esClient, 'logs', doc);
        expect(response.result).to.eql('created');
        await waitForDocumentInIndex({ esClient, indexName: 'logs', retryService, logger });

        const result = await fetchDocument(esClient, 'logs', response._id);
        expect(result._index).to.match(/^\.ds\-logs-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: 'test',
          log: { level: 'info', logger: 'nginx' },
        });
      });

      it('Fork logs to logs.nginx', async () => {
        const body = {
          stream: {
            id: 'logs.nginx',
            fields: [],
            processing: [],
          },
          condition: {
            field: 'log.logger',
            operator: 'eq',
            value: 'nginx',
          },
        };
        const response = await forkStream(supertest, 'logs', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index an Nginx access log message, should goto logs.nginx', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: JSON.stringify({
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const response = await indexDocument(esClient, 'logs', doc);
        expect(response.result).to.eql('created');
        await waitForDocumentInIndex({ esClient, indexName: 'logs.nginx', retryService, logger });

        const result = await fetchDocument(esClient, 'logs.nginx', response._id);
        expect(result._index).to.match(/^\.ds\-logs.nginx-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: 'test',
          log: { level: 'info', logger: 'nginx' },
        });
      });

      it('Fork logs to logs.nginx.access', async () => {
        const body = {
          stream: {
            id: 'logs.nginx.access',
            fields: [],
            processing: [],
          },
          condition: { field: 'log.level', operator: 'eq', value: 'info' },
        };
        const response = await forkStream(supertest, 'logs.nginx', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index an Nginx access log message, should goto logs.nginx.access', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const response = await indexDocument(esClient, 'logs', doc);
        expect(response.result).to.eql('created');
        await waitForDocumentInIndex({
          esClient,
          indexName: 'logs.nginx.access',
          retryService,
          logger,
        });

        const result = await fetchDocument(esClient, 'logs.nginx.access', response._id);
        expect(result._index).to.match(/^\.ds\-logs.nginx.access-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: 'test',
          log: { level: 'info', logger: 'nginx' },
        });
      });
    });
  });
}

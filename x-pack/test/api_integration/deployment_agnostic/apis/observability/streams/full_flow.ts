/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  fetchDocument,
  forkStream,
  indexDocument,
} from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  interface Resources {
    indices: string[];
    componentTemplates: string[];
    indexTemplates: string[];
  }

  function getResources(): Promise<Resources> {
    return Promise.all([
      esClient.indices.get({
        index: ['logs*'],
        allow_no_indices: true,
      }),
      esClient.cluster.getComponentTemplate({
        name: 'logs*',
      }),
      esClient.indices.getIndexTemplate({
        name: 'logs*',
      }),
    ]).then(([indicesResponse, componentTemplateResponse, indexTemplateResponse]) => {
      return {
        indices: Object.keys(indicesResponse.indices ?? {}),
        componentTemplates: componentTemplateResponse.component_templates.map(
          (template) => template.name
        ),
        indexTemplates: indexTemplateResponse.index_templates.map((template) => template.name),
      };
    });
  }

  describe('Basic functionality', () => {
    async function getEnabled() {
      const response = await apiClient.fetch('GET /api/streams/_status').expect(200);
      return response.body.enabled;
    }

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
    });

    describe('initially', () => {
      let resources: Resources;

      before(async () => {
        resources = await getResources();
      });

      it('is not enabled', async () => {
        expect(await getEnabled()).to.eql(false);
      });

      describe('after enabling', () => {
        before(async () => {
          await enableStreams(apiClient);
        });

        it('is enabled', async () => {
          await disableStreams(apiClient);
        });

        describe('after disabling', () => {
          before(async () => {
            await disableStreams(apiClient);
          });

          it('cleans up all the resources', async () => {
            expect(await getResources()).to.eql(resources);
          });

          it('returns a 404 for logs', async () => {
            await apiClient
              .fetch('GET /api/streams/{name}', {
                params: {
                  path: {
                    name: 'logs',
                  },
                },
              })
              .expect(404);
          });

          it('is disabled', async () => {
            expect(await getEnabled()).to.eql(false);
          });
        });
      });
    });

    // Note: Each step is dependent on the previous
    describe('Full flow', () => {
      before(async () => {
        await enableStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
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
        const result = await fetchDocument(esClient, 'logs', response._id);
        expect(result._index).to.match(/^\.ds\-logs-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: 'test',
          'log.level': 'info',
          'log.logger': 'nginx',
          'stream.name': 'logs',
        });
      });

      it('Index a doc with a stream field', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: JSON.stringify({
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
            stream: 'somethingelse', // a field named stream should work as well
          }),
        };
        const response = await indexDocument(esClient, 'logs', doc);
        expect(response.result).to.eql('created');
        const result = await fetchDocument(esClient, 'logs', response._id);
        expect(result._index).to.match(/^\.ds\-logs-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: 'test',
          'log.level': 'info',
          'log.logger': 'nginx',
          'stream.name': 'logs',
          stream: 'somethingelse',
        });
      });

      it('Fork logs to logs.nginx', async () => {
        const body = {
          stream: {
            name: 'logs.nginx',
          },
          if: {
            field: 'log.logger',
            operator: 'eq' as const,
            value: 'nginx',
          },
        };
        const response = await forkStream(apiClient, 'logs', body);
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

        const result = await fetchDocument(esClient, 'logs.nginx', response._id);
        expect(result._index).to.match(/^\.ds\-logs.nginx-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: 'test',
          'log.level': 'info',
          'log.logger': 'nginx',
          'stream.name': 'logs.nginx',
        });
      });

      it('Fork logs to logs.nginx.access', async () => {
        const body = {
          stream: {
            name: 'logs.nginx.access',
          },
          if: { field: 'log.level', operator: 'eq' as const, value: 'info' },
        };
        const response = await forkStream(apiClient, 'logs.nginx', body);
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

        const result = await fetchDocument(esClient, 'logs.nginx.access', response._id);
        expect(result._index).to.match(/^\.ds\-logs.nginx.access-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: 'test',
          'log.level': 'info',
          'log.logger': 'nginx',
          'stream.name': 'logs.nginx.access',
        });
      });

      it('Fork logs to logs.nginx.error with invalid condition', async () => {
        const body = {
          stream: {
            name: 'logs.nginx.error',
          },
          if: { field: 'log', operator: 'eq' as const, value: 'error' },
        };
        const response = await forkStream(apiClient, 'logs.nginx', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index an Nginx error log message, should goto logs.nginx.error but fails', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            'log.level': 'error',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const response = await indexDocument(esClient, 'logs', doc);
        expect(response.result).to.eql('created');

        const result = await fetchDocument(esClient, 'logs.nginx', response._id);
        expect(result._index).to.match(/^\.ds\-logs.nginx-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: 'test',
          'log.level': 'error',
          'log.logger': 'nginx',
          'stream.name': 'logs.nginx',
        });
      });

      it('Fork logs to logs.number-test', async () => {
        const body = {
          stream: {
            name: 'logs.number-test',
          },
          if: { field: 'code', operator: 'gte' as const, value: '500' },
        };
        const response = await forkStream(apiClient, 'logs', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index documents with numbers and strings for logs.number-test condition', async () => {
        const doc1 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            code: '500',
            message: 'test',
          }),
        };
        const doc2 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            code: 500,
            message: 'test',
          }),
        };
        const response1 = await indexDocument(esClient, 'logs', doc1);
        expect(response1.result).to.eql('created');
        const response2 = await indexDocument(esClient, 'logs', doc2);
        expect(response2.result).to.eql('created');
      });

      it('Fork logs to logs.string-test', async () => {
        const body = {
          stream: {
            name: 'logs.string-test',
          },
          if: {
            or: [
              { field: 'message', operator: 'contains' as const, value: '500' },
              { field: 'message', operator: 'contains' as const, value: 400 },
            ],
          },
        };
        const response = await forkStream(apiClient, 'logs', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index documents with numbers and strings for logs.string-test condition', async () => {
        const doc1 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            message: 'status_code: 500',
          }),
        };
        const doc2 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            message: 'status_code: 400',
          }),
        };
        const response1 = await indexDocument(esClient, 'logs', doc1);
        expect(response1.result).to.eql('created');

        const response2 = await indexDocument(esClient, 'logs', doc2);
        expect(response2.result).to.eql('created');
      });
    });
  });
}

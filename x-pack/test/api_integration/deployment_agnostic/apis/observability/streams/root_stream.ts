/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IngestStreamUpsertRequest, WiredStreamDefinition } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { disableStreams, enableStreams, indexDocument, putStream } from './helpers/requests';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

const rootStreamDefinition: WiredStreamDefinition = {
  name: 'logs',
  ingest: {
    lifecycle: { dsl: {} },
    processing: [],
    routing: [],
    wired: {
      fields: {
        '@timestamp': {
          type: 'date',
        },
        message: {
          type: 'match_only_text',
        },
        'host.name': {
          type: 'keyword',
        },
        'log.level': {
          type: 'keyword',
        },
        'stream.name': {
          type: 'keyword',
        },
      },
    },
  },
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  describe('Root stream', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('Should not allow processing changes', async () => {
      const body: IngestStreamUpsertRequest = {
        dashboards: [],
        stream: {
          ingest: {
            ...rootStreamDefinition.ingest,
            processing: [
              {
                grok: {
                  field: 'message',
                  patterns: [
                    '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                  ],
                  if: { always: {} },
                },
              },
            ],
          },
        },
      };
      const response = await putStream(apiClient, 'logs', body, 400);
      expect(response).to.have.property(
        'message',
        'Root stream processing rules cannot be changed'
      );
    });

    it('Should not allow fields changes', async () => {
      const body: IngestStreamUpsertRequest = {
        dashboards: [],
        stream: {
          ingest: {
            ...rootStreamDefinition.ingest,
            wired: {
              fields: {
                ...rootStreamDefinition.ingest.wired.fields,
                'log.level': {
                  type: 'boolean',
                },
              },
            },
          },
        },
      };
      const response = await putStream(apiClient, 'logs', body, 400);
      expect(response).to.have.property('message', 'Root stream fields cannot be changed');
    });

    it('Should allow routing changes', async () => {
      const body: IngestStreamUpsertRequest = {
        dashboards: [],
        stream: {
          ingest: {
            ...rootStreamDefinition.ingest,
            routing: [
              {
                destination: 'logs.gcpcloud',
                if: {
                  field: 'cloud.provider',
                  operator: 'eq',
                  value: 'gcp',
                },
              },
            ],
          },
        },
      };
      const response = await putStream(apiClient, 'logs', body);
      expect(response).to.have.property('acknowledged', true);
    });

    it('Should not allow sending data directly to a child stream', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:20.000Z',
        message: 'test',
      };
      let threw = false;
      try {
        await indexDocument(esClient, 'logs.gcpcloud', doc);
      } catch (e) {
        threw = true;
        expect(e.message).to.contain('stream.name is not set properly');
      }
      expect(threw).to.be(true);
    });
  });
}

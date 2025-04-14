/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  IngestStreamLifecycle,
  IngestStreamUpsertRequest,
  WiredStreamGetResponse,
  isDslLifecycle,
  isIlmLifecycle,
} from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams, getStream, putStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Significant Events', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Wired streams update', () => {
      it('updates the queries', async () => {
        let streamDefinition = await getStream(apiClient, 'logs');
        expect(streamDefinition.queries.length).to.eql(0);

        const response = await putStream(apiClient, 'logs', {
          stream: {
            ingest: {
              ...(streamDefinition as WiredStreamGetResponse).stream.ingest,
            },
          },
          dashboards: [],
          queries: [{ id: 'aaa', title: 'OOM Error', kql: { query: "message: 'OOM Error'" } }],
        });
        expect(response).to.have.property('acknowledged', true);

        streamDefinition = await getStream(apiClient, 'logs');
        expect(streamDefinition.queries.length).to.eql(1);
        expect(streamDefinition.queries[0]).to.eql({
          id: 'aaa',
          title: 'OOM Error',
          kql: { query: "message: 'OOM Error'" },
        });
      });
    });

    describe('Unwired streams update', () => {
      const unwiredPutBody: IngestStreamUpsertRequest = {
        stream: {
          ingest: {
            lifecycle: { inherit: {} },
            processing: [],
            unwired: {},
          },
        },
        dashboards: [],
        queries: [],
      };

      const createDataStream = async (name: string, lifecycle: IngestStreamLifecycle) => {
        await esClient.indices.putIndexTemplate({
          name,
          index_patterns: [name],
          data_stream: {},
          template: isDslLifecycle(lifecycle)
            ? {
                lifecycle: { data_retention: lifecycle.dsl.data_retention },
                settings: {
                  'index.lifecycle.prefer_ilm': false,
                  'index.default_pipeline': 'logs@default-pipeline',
                },
              }
            : isIlmLifecycle(lifecycle)
            ? {
                settings: {
                  'index.default_pipeline': 'logs@default-pipeline',
                  'index.lifecycle.prefer_ilm': true,
                  'index.lifecycle.name': lifecycle.ilm.policy,
                },
              }
            : undefined,
        });
        await esClient.indices.createDataStream({ name });

        return async () => {
          await esClient.indices.deleteDataStream({ name });
          await esClient.indices.deleteIndexTemplate({ name });
        };
      };

      it('updates the queries', async () => {
        const indexName = 'unwired-stream-queries';
        const clean = await createDataStream(indexName, { dsl: { data_retention: '77d' } });
        await putStream(apiClient, indexName, unwiredPutBody);

        let streamDefinition = await getStream(apiClient, indexName);
        expect(streamDefinition.queries.length).to.eql(0);

        await putStream(apiClient, indexName, {
          ...unwiredPutBody,
          queries: [{ id: 'aaa', title: 'OOM Error', kql: { query: "message: 'OOM Error'" } }],
        });

        streamDefinition = await getStream(apiClient, indexName);
        expect(streamDefinition.queries.length).to.eql(1);
        expect(streamDefinition.queries[0]).to.eql({
          id: 'aaa',
          title: 'OOM Error',
          kql: { query: "message: 'OOM Error'" },
        });

        await clean();
      });
    });
  });
}

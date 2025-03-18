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
  UnwiredStreamGetResponse,
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

  describe('Update Stream', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('WiredStream update', () => {
      it('updates the description', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        const response = await putStream(apiClient, 'logs', {
          dashboards: [],
          stream: {
            ingest: (rootDefinition as WiredStreamGetResponse).stream.ingest,
            description: 'some description',
          },
        });
        expect(response).to.have.property('acknowledged', true);

        const updatedRootDefinition = await getStream(apiClient, 'logs');
        expect((updatedRootDefinition as WiredStreamGetResponse).stream.description).to.eql(
          'some description'
        );
      });
    });

    describe('UnwiredStream update', () => {
      const unwiredPutBody: IngestStreamUpsertRequest = {
        stream: {
          description: 'irrelevant',
          ingest: {
            lifecycle: { inherit: {} },
            processing: [],
            unwired: {},
          },
        },
        dashboards: [],
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

      it('updates the description', async () => {
        const indexName = 'unwired-stream-override-description';
        const clean = await createDataStream(indexName, { dsl: { data_retention: '77d' } });

        await putStream(apiClient, indexName, {
          dashboards: [],
          stream: {
            ...unwiredPutBody.stream,
            description: 'some description',
          },
        });

        const streamDefinition = await getStream(apiClient, 'unwired-stream-override-description');
        expect((streamDefinition as UnwiredStreamGetResponse).stream.description).eql(
          'some description'
        );

        await clean();
      });
    });
  });
}

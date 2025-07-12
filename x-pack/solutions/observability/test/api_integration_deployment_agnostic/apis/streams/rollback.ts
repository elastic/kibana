/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { isNotFoundError } from '@kbn/es-errors';
import expect from '@kbn/expect';
import { Streams } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams, putStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('rollback on failure', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('should attempt a rollback to clean up partially created Streams on unexpected failure', async () => {
      // Assert some Stream resource doesn't exist
      await assertDataStreamMissing(esClient, 'logs.rollback');

      // Attempt to create a Stream, we use an invalid Ingest Pipeline to make sure it fails after creating the data stream (we have other tests that verify the creation)
      // This means that the data stream needs to be cleaned up so a roll back should delete it
      const body: Streams.WiredStream.UpsertRequest = {
        dashboards: [],
        queries: [],
        stream: {
          description: 'Should cause a failure due to excessive fields and trigger a rollback',
          ingest: {
            lifecycle: { inherit: {} },
            processing: [
              {
                manual_ingest_pipeline: {
                  processors: [
                    {
                      set: {
                        field: 'whatever',
                        fail: 'because this property is not valid',
                      },
                    },
                  ],
                },
              },
            ],
            wired: {
              fields: {},
              routing: [],
            },
          },
        },
      };
      const response = await putStream(apiClient, 'logs.rollback', body, 500);
      expect((response as any).message).to.contain('Failed to change state');

      // Assert that the resource was deleted
      await assertDataStreamMissing(esClient, 'logs.rollback');
    });
  });
}

async function assertDataStreamMissing(esClient: Client, name: string) {
  try {
    await esClient.indices.getDataStream({
      name,
    });
    throw new Error('Expected data stream to not exist');
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }
}

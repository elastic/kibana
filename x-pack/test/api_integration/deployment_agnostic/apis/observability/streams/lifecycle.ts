/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  IngestStreamEffectiveLifecycle,
  IngestStreamLifecycle,
  IngestStreamUpsertRequest,
  WiredStreamGetResponse,
  asIngestStreamGetResponse,
  isDslLifecycle,
  isIlmLifecycle,
} from '@kbn/streams-schema';
import { disableStreams, enableStreams, putStream, getStream } from './helpers/requests';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const config = getService('config');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const isServerless = !!config.get('serverless');
  let apiClient: StreamsSupertestRepositoryClient;

  async function expectLifecycle(
    streams: string[],
    expectedLifecycle: IngestStreamEffectiveLifecycle
  ) {
    const definitions = await Promise.all(streams.map((stream) => getStream(apiClient, stream)));
    for (const definition of definitions) {
      expect(asIngestStreamGetResponse(definition).effective_lifecycle).to.eql(expectedLifecycle);
    }

    const dataStreams = await esClient.indices.getDataStream({ name: streams });
    for (const dataStream of dataStreams.data_streams) {
      if (isDslLifecycle(expectedLifecycle)) {
        expect(dataStream.lifecycle?.data_retention).to.eql(expectedLifecycle.dsl.data_retention);
        expect(dataStream.indices.every((index) => !index.ilm_policy)).to.eql(
          true,
          'backing indices should not specify an ilm_policy'
        );
        if (!isServerless) {
          expect(dataStream.prefer_ilm).to.eql(false, 'data stream should not specify prefer_ilm');
          expect(dataStream.indices.every((index) => !index.prefer_ilm)).to.eql(
            true,
            'backing indices should not specify prefer_ilm'
          );
        }
      } else if (isIlmLifecycle(expectedLifecycle)) {
        expect(dataStream.prefer_ilm).to.eql(true, 'data stream should specify prefer_ilm');
        expect(dataStream.ilm_policy).to.eql(expectedLifecycle.ilm.policy);
        expect(
          dataStream.indices.every(
            (index) => index.prefer_ilm && index.ilm_policy === expectedLifecycle.ilm.policy
          )
        ).to.eql(true, 'backing indices should specify prefer_ilm and ilm_policy');
      }
    }
  }

  describe('Lifecycle', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Wired streams', () => {
      const wiredPutBody: IngestStreamUpsertRequest = {
        stream: {
          ingest: {
            lifecycle: { inherit: {} },
            routing: [],
            processing: [],
            wired: { fields: {} },
          },
        },
        dashboards: [],
      };

      it('updates lifecycle', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        const response = await putStream(apiClient, 'logs', {
          dashboards: [],
          stream: {
            ingest: {
              ...(rootDefinition as WiredStreamGetResponse).stream.ingest,
              lifecycle: { dsl: { data_retention: '999d' } },
            },
          },
        });
        expect(response).to.have.property('acknowledged', true);

        const updatedRootDefinition = await getStream(apiClient, 'logs');
        expect((updatedRootDefinition as WiredStreamGetResponse).stream.ingest.lifecycle).to.eql({
          dsl: { data_retention: '999d' },
        });
        expect((updatedRootDefinition as WiredStreamGetResponse).effective_lifecycle).to.eql({
          dsl: { data_retention: '999d' },
          from: 'logs',
        });
      });

      it('does not allow inherit lifecycle on root', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        await putStream(
          apiClient,
          'logs',
          {
            dashboards: [],
            stream: {
              ingest: {
                ...(rootDefinition as WiredStreamGetResponse).stream.ingest,
                lifecycle: { inherit: {} },
              },
            },
          },
          400
        );
      });

      it('inherits dlm', async () => {
        // create two branches, one that inherits from root and
        // another one that overrides the root lifecycle
        await putStream(apiClient, 'logs.inherits.lifecycle', wiredPutBody);
        await putStream(apiClient, 'logs.overrides.lifecycle', wiredPutBody);

        const rootDefinition = await getStream(apiClient, 'logs');
        await putStream(apiClient, 'logs', {
          dashboards: [],
          stream: {
            ingest: {
              ...(rootDefinition as WiredStreamGetResponse).stream.ingest,
              lifecycle: { dsl: { data_retention: '10m' } },
            },
          },
        });
        await putStream(apiClient, 'logs.overrides', {
          dashboards: [],
          stream: {
            ingest: {
              ...wiredPutBody.stream.ingest,
              routing: [{ destination: 'logs.overrides.lifecycle', if: { never: {} } }],
              lifecycle: { dsl: { data_retention: '1d' } },
            },
          },
        });

        await expectLifecycle(['logs.inherits', 'logs.inherits.lifecycle'], {
          dsl: { data_retention: '10m' },
          from: 'logs',
        });

        await expectLifecycle(['logs.overrides', 'logs.overrides.lifecycle'], {
          dsl: { data_retention: '1d' },
          from: 'logs.overrides',
        });
      });

      it('applies the nearest parent lifecycle when deleted', async () => {
        await putStream(apiClient, 'logs.10d', {
          dashboards: [],
          stream: {
            ingest: {
              ...wiredPutBody.stream.ingest,
              lifecycle: { dsl: { data_retention: '10d' } },
            },
          },
        });
        await putStream(apiClient, 'logs.10d.20d', {
          dashboards: [],
          stream: {
            ingest: {
              ...wiredPutBody.stream.ingest,
              lifecycle: { dsl: { data_retention: '20d' } },
            },
          },
        });
        await putStream(apiClient, 'logs.10d.20d.inherits', wiredPutBody);

        // delete lifecycle of the 20d override
        await putStream(apiClient, 'logs.10d.20d', {
          dashboards: [],
          stream: {
            ingest: {
              ...wiredPutBody.stream.ingest,
              routing: [{ destination: 'logs.10d.20d.inherits', if: { never: {} } }],
            },
          },
        });

        await expectLifecycle(['logs.10d', 'logs.10d.20d', 'logs.10d.20d.inherits'], {
          dsl: { data_retention: '10d' },
          from: 'logs.10d',
        });
      });

      it('handles no retention dsl', async () => {
        await putStream(apiClient, 'logs.no', {
          dashboards: [],
          stream: {
            ingest: {
              ...wiredPutBody.stream.ingest,
              lifecycle: { dsl: { data_retention: '2d' } },
            },
          },
        });

        await putStream(apiClient, 'logs.no.retention', {
          dashboards: [],
          stream: {
            ingest: {
              ...wiredPutBody.stream.ingest,
              lifecycle: { dsl: {} },
            },
          },
        });

        await expectLifecycle(['logs.no.retention'], {
          dsl: {},
          from: 'logs.no.retention',
        });
      });

      if (isServerless) {
        it('does not support ilm', async () => {
          await putStream(
            apiClient,
            'logs.ilm',
            {
              dashboards: [],
              stream: {
                ingest: {
                  ...wiredPutBody.stream.ingest,
                  lifecycle: { ilm: { policy: 'my-policy' } },
                },
              },
            },
            400
          );
        });
      } else {
        it('inherits ilm', async () => {
          await putStream(apiClient, 'logs.ilm.stream', wiredPutBody);
          await putStream(apiClient, 'logs.ilm', {
            dashboards: [],
            stream: {
              ingest: {
                ...wiredPutBody.stream.ingest,
                routing: [{ destination: 'logs.ilm.stream', if: { never: {} } }],
                lifecycle: { ilm: { policy: 'my-policy' } },
              },
            },
          });

          await expectLifecycle(['logs.ilm', 'logs.ilm.stream'], {
            ilm: { policy: 'my-policy' },
            from: 'logs.ilm',
          });
        });

        it('updates when transitioning from ilm to dlm', async () => {
          const name = 'logs.ilm-with-backing-indices';
          await putStream(apiClient, name, {
            dashboards: [],
            stream: {
              ingest: {
                ...wiredPutBody.stream.ingest,
                routing: [],
                lifecycle: { ilm: { policy: 'my-policy' } },
              },
            },
          });

          await esClient.indices.rollover({ alias: name });
          await esClient.indices.rollover({ alias: name });

          await putStream(apiClient, name, {
            dashboards: [],
            stream: {
              ingest: {
                ...wiredPutBody.stream.ingest,
                routing: [],
                lifecycle: { dsl: { data_retention: '7d' } },
              },
            },
          });

          await expectLifecycle([name], { dsl: { data_retention: '7d' }, from: name });
        });

        it('updates when transitioning from dlm to ilm', async () => {
          const name = 'logs.dlm-with-backing-indices';
          await putStream(apiClient, name, {
            dashboards: [],
            stream: {
              ingest: {
                ...wiredPutBody.stream.ingest,
                routing: [],
                lifecycle: { dsl: { data_retention: '7d' } },
              },
            },
          });

          await esClient.indices.rollover({ alias: name });
          await esClient.indices.rollover({ alias: name });

          await putStream(apiClient, name, {
            dashboards: [],
            stream: {
              ingest: {
                ...wiredPutBody.stream.ingest,
                routing: [],
                lifecycle: { ilm: { policy: 'my-policy' } },
              },
            },
          });

          await expectLifecycle([name], { ilm: { policy: 'my-policy' }, from: name });
        });
      }
    });

    describe('Unwired streams', () => {
      const unwiredPutBody: IngestStreamUpsertRequest = {
        stream: {
          ingest: {
            lifecycle: { inherit: {} },
            routing: [],
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

      it('noop when inherit lifecycle', async () => {
        const indexName = 'unwired-stream-inherit';
        const clean = await createDataStream(indexName, { dsl: { data_retention: '77d' } });

        await putStream(apiClient, indexName, unwiredPutBody);

        await expectLifecycle([indexName], { dsl: { data_retention: '77d' } });

        await clean();
      });

      it('overrides dsl retention', async () => {
        const indexName = 'unwired-stream-override-dsl';
        const clean = await createDataStream(indexName, { dsl: { data_retention: '77d' } });

        await putStream(apiClient, indexName, {
          dashboards: [],
          stream: {
            ingest: {
              ...unwiredPutBody.stream.ingest,
              lifecycle: { dsl: { data_retention: '11d' } },
            },
          },
        });

        await expectLifecycle([indexName], { dsl: { data_retention: '11d' } });

        await clean();
      });

      if (!isServerless) {
        it('does not allow dsl lifecycle if the data stream is managed by ilm', async () => {
          const indexName = 'unwired-stream-ilm-to-dsl';
          const clean = await createDataStream(indexName, { ilm: { policy: 'my-policy' } });

          await putStream(
            apiClient,
            indexName,
            {
              dashboards: [],
              stream: {
                ingest: {
                  ...unwiredPutBody.stream.ingest,
                  lifecycle: { dsl: { data_retention: '1d' } },
                },
              },
            },
            400
          );

          await clean();
        });
      }
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rawExpect from 'expect';
import expect from '@kbn/expect';
import {
  IngestStreamEffectiveLifecycle,
  IngestStreamLifecycle,
  IngestStreamLifecycleDisabled,
  Streams,
  isDisabledLifecycle,
  isDslLifecycle,
  isIlmLifecycle,
} from '@kbn/streams-schema';
import { IndicesManagedBy } from '@elastic/elasticsearch/lib/api/types';
import {
  disableStreams,
  enableStreams,
  putStream,
  getStream,
  getIlmStats,
} from './helpers/requests';
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
      expect(Streams.ingest.all.GetResponse.parse(definition).effective_lifecycle).to.eql(
        expectedLifecycle
      );
    }

    const dataStreams = await esClient.indices.getDataStream({ name: streams });
    for (const dataStream of dataStreams.data_streams) {
      if (isDslLifecycle(expectedLifecycle)) {
        const managedBy: IndicesManagedBy = 'Data stream lifecycle';
        expect(dataStream.next_generation_managed_by).to.eql(managedBy);
        expect(dataStream.lifecycle?.data_retention).to.eql(expectedLifecycle.dsl.data_retention);
        expect(dataStream.indices.every((index) => index.managed_by === managedBy)).to.eql(
          true,
          'backing indices should be managed by DSL'
        );

        if (!isServerless) {
          expect(dataStream.prefer_ilm).to.eql(
            false,
            `data stream ${dataStream.name} should not specify prefer_ilm`
          );
          expect(dataStream.indices.every((index) => !index.prefer_ilm)).to.eql(
            true,
            'backing indices should not specify prefer_ilm'
          );
        }
      } else if (isIlmLifecycle(expectedLifecycle)) {
        const managedBy: IndicesManagedBy = 'Index Lifecycle Management';
        expect(dataStream.next_generation_managed_by).to.eql(managedBy);
        expect(dataStream.prefer_ilm).to.eql(
          true,
          `data stream ${dataStream.name} should specify prefer_ilm`
        );
        expect(dataStream.ilm_policy).to.eql(expectedLifecycle.ilm.policy);
        expect(
          dataStream.indices.every(
            (index) =>
              index.prefer_ilm &&
              index.ilm_policy === expectedLifecycle.ilm.policy &&
              index.managed_by === managedBy
          )
        ).to.eql(true, 'backing indices should be managed by ILM');
      } else if (isDisabledLifecycle(expectedLifecycle)) {
        const managedBy: IndicesManagedBy = 'Unmanaged';
        expect(dataStream.next_generation_managed_by).to.eql(managedBy);
        expect(dataStream.indices.every((index) => index.managed_by === managedBy));
      } else {
        throw new Error(
          `Check against lifecycle [${JSON.stringify(expectedLifecycle)}] is not implemented`
        );
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

    const wiredPutBody: Streams.WiredStream.UpsertRequest = {
      stream: {
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: [],
          wired: { fields: {}, routing: [] },
        },
      },
      dashboards: [],
      queries: [],
    };

    describe('Wired streams update', () => {
      it('updates lifecycle', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        const response = await putStream(apiClient, 'logs', {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              lifecycle: { dsl: { data_retention: '999d' } },
            },
          },
        });
        expect(response).to.have.property('acknowledged', true);

        const updatedRootDefinition = await getStream(apiClient, 'logs');
        expect(
          (updatedRootDefinition as Streams.WiredStream.GetResponse).stream.ingest.lifecycle
        ).to.eql({
          dsl: { data_retention: '999d' },
        });
        expect(
          (updatedRootDefinition as Streams.WiredStream.GetResponse).effective_lifecycle
        ).to.eql({
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
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
                lifecycle: { inherit: {} },
              },
            },
          },
          400
        );
      });

      it('inherits on creation', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');
        await putStream(apiClient, 'logs', {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              lifecycle: { dsl: { data_retention: '50d' } },
            },
          },
        });
        await putStream(apiClient, 'logs.inheritsatcreation', wiredPutBody);

        await expectLifecycle(['logs.inheritsatcreation'], {
          dsl: { data_retention: '50d' },
          from: 'logs',
        });
      });

      it('inherits dsl', async () => {
        // create two branches, one that inherits from root and
        // another one that overrides the root lifecycle
        await putStream(apiClient, 'logs.inherits.lifecycle', wiredPutBody);
        await putStream(apiClient, 'logs.overrides.lifecycle', wiredPutBody);

        const rootDefinition = await getStream(apiClient, 'logs');
        await putStream(apiClient, 'logs', {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              lifecycle: { dsl: { data_retention: '10m' } },
            },
          },
        });
        await putStream(apiClient, 'logs.overrides', {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [{ destination: 'logs.overrides.lifecycle', if: { never: {} } }],
              },
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
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              lifecycle: { dsl: { data_retention: '10d' } },
            },
          },
        });
        await putStream(apiClient, 'logs.10d.20d', {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
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
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [{ destination: 'logs.10d.20d.inherits', if: { never: {} } }],
              },
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
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              lifecycle: { dsl: { data_retention: '2d' } },
            },
          },
        });

        await putStream(apiClient, 'logs.no.retention', {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
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
              queries: [],
              stream: {
                description: '',
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
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  fields: {},
                  routing: [{ destination: 'logs.ilm.stream', if: { never: {} } }],
                },
                lifecycle: { ilm: { policy: 'my-policy' } },
              },
            },
          });

          await expectLifecycle(['logs.ilm', 'logs.ilm.stream'], {
            ilm: { policy: 'my-policy' },
            from: 'logs.ilm',
          });
        });

        it('updates when transitioning from ilm to dsl', async () => {
          const name = 'logs.ilm-with-backing-indices';
          await putStream(apiClient, name, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                lifecycle: { ilm: { policy: 'my-policy' } },
              },
            },
          });

          await esClient.indices.rollover({ alias: name });
          await esClient.indices.rollover({ alias: name });

          await putStream(apiClient, name, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  fields: {},
                  routing: [],
                },
                lifecycle: { dsl: { data_retention: '7d' } },
              },
            },
          });

          await expectLifecycle([name], { dsl: { data_retention: '7d' }, from: name });
        });

        it('updates when transitioning from dsl to ilm', async () => {
          const name = 'logs.dsl-with-backing-indices';
          await putStream(apiClient, name, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  fields: {},
                  routing: [],
                },
                lifecycle: { dsl: { data_retention: '7d' } },
              },
            },
          });

          await esClient.indices.rollover({ alias: name });
          await esClient.indices.rollover({ alias: name });

          await putStream(apiClient, name, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  routing: [],
                  fields: {},
                },
                lifecycle: { ilm: { policy: 'my-policy' } },
              },
            },
          });

          await expectLifecycle([name], { ilm: { policy: 'my-policy' }, from: name });
        });
      }
    });

    describe('Unwired streams update', () => {
      const unwiredPutBody: Streams.UnwiredStream.UpsertRequest = {
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: [],
            unwired: {},
          },
        },
        dashboards: [],
        queries: [],
      };

      let clean: () => Promise<void>;
      afterEach(() => clean?.());

      const createDataStream = async (
        name: string,
        lifecycle: IngestStreamLifecycle | IngestStreamLifecycleDisabled
      ) => {
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
        await esClient.index({ index: name, document: { '@timestamp': new Date() } });

        clean = async () => {
          await esClient.indices.deleteDataStream({ name });
          await esClient.indices.deleteIndexTemplate({ name });
        };
      };

      it('inherit falls back to template dsl configuration', async () => {
        const indexName = 'unwired-stream-inherit-dsl';
        await createDataStream(indexName, { dsl: { data_retention: '77d' } });

        // initially set to inherit which is a noop
        await putStream(apiClient, indexName, unwiredPutBody);
        await esClient.indices.rollover({ alias: indexName });
        await expectLifecycle([indexName], { dsl: { data_retention: '77d' } });

        // update lifecycle
        await putStream(apiClient, indexName, {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...unwiredPutBody.stream.ingest,
              lifecycle: { dsl: { data_retention: '2d' } },
            },
          },
        });
        await expectLifecycle([indexName], { dsl: { data_retention: '2d' } });

        // inherit sets the lifecycle back to the template configuration
        await putStream(apiClient, indexName, unwiredPutBody, 200);
        await expectLifecycle([indexName], { dsl: { data_retention: '77d' } });
      });

      it('overrides dsl retention', async () => {
        const indexName = 'unwired-stream-override-dsl';
        await createDataStream(indexName, { dsl: { data_retention: '77d' } });

        await putStream(apiClient, indexName, {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...unwiredPutBody.stream.ingest,
              lifecycle: { dsl: { data_retention: '11d' } },
            },
          },
        });

        await expectLifecycle([indexName], { dsl: { data_retention: '11d' } });
      });

      if (isServerless) {
        it('does not support ilm', async () => {
          const indexName = 'unwired-stream-no-ilm';
          await createDataStream(indexName, { dsl: { data_retention: '2d' } });

          await putStream(
            apiClient,
            indexName,
            {
              dashboards: [],
              queries: [],
              stream: {
                description: '',
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
        it('updates from ilm to dsl', async () => {
          const indexName = 'unwired-stream-ilm-to-dsl';
          await createDataStream(indexName, { ilm: { policy: 'my-policy' } });

          await putStream(apiClient, indexName, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...unwiredPutBody.stream.ingest,
                lifecycle: { dsl: { data_retention: '1d' } },
              },
            },
          });

          await expectLifecycle([indexName], { dsl: { data_retention: '1d' } });
        });

        it('updates from dsl to ilm', async () => {
          const indexName = 'unwired-stream-dsl-to-ilm';
          await createDataStream(indexName, { dsl: { data_retention: '10d' } });

          await putStream(apiClient, indexName, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...unwiredPutBody.stream.ingest,
                lifecycle: { ilm: { policy: 'my-policy' } },
              },
            },
          });

          await expectLifecycle([indexName], { ilm: { policy: 'my-policy' } });
        });

        it('inherit falls back to template dsl or ilm configuration', async () => {
          const indexName = 'unwired-stream-inherit-dsl-ilm';
          const templateLifecycle = { ilm: { policy: 'my-policy' } };
          await createDataStream(indexName, templateLifecycle);

          // initially set to inherit which is a noop
          await putStream(apiClient, indexName, unwiredPutBody);
          await esClient.indices.rollover({ alias: indexName });
          await expectLifecycle([indexName], templateLifecycle);

          // update lifecycle
          await putStream(apiClient, indexName, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...unwiredPutBody.stream.ingest,
                lifecycle: { dsl: { data_retention: '2d' } },
              },
            },
          });
          await expectLifecycle([indexName], { dsl: { data_retention: '2d' } });

          // inherit sets the lifecycle back to the template configuration
          await putStream(apiClient, indexName, unwiredPutBody);
          await expectLifecycle([indexName], templateLifecycle);

          // update the template to use a new ilm policy
          await createDataStream(indexName, { ilm: { policy: 'my-updated-policy' } });
          await esClient.indices.rollover({ alias: indexName });

          // since inherit gives control back to the template, new write indices should
          // pick up the updated template
          const {
            data_streams: [{ indices }],
          } = await esClient.indices.getDataStream({ name: indexName });
          expect(indices[indices.length - 1].ilm_policy).to.eql('my-updated-policy');
          expect(indices.slice(0, -1).every((index) => index.ilm_policy === 'my-policy')).to.eql(
            true,
            'all indices up until the update should use the former policy'
          );
        });

        it('inherit falls back to template disabled configuration', async () => {
          const indexName = 'unwired-stream-inherit-disabled';
          const templateLifecycle = { disabled: {} };
          await createDataStream(indexName, templateLifecycle);

          // initially set to inherit which is a noop
          await putStream(apiClient, indexName, unwiredPutBody);
          await esClient.indices.rollover({ alias: indexName });
          await expectLifecycle([indexName], templateLifecycle);

          // update lifecycle to dsl
          await putStream(apiClient, indexName, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...unwiredPutBody.stream.ingest,
                lifecycle: { dsl: { data_retention: '2d' } },
              },
            },
          });
          await expectLifecycle([indexName], { dsl: { data_retention: '2d' } });

          // update lifecycle to ilm
          await putStream(apiClient, indexName, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...unwiredPutBody.stream.ingest,
                lifecycle: { ilm: { policy: 'my-policy' } },
              },
            },
          });
          await expectLifecycle([indexName], { ilm: { policy: 'my-policy' } });

          // inherit sets the lifecycle back to the template configuration
          await putStream(apiClient, indexName, unwiredPutBody);
          await expectLifecycle([indexName], templateLifecycle);
        });
      }
    });

    describe('ilm stats', () => {
      it('is not enabled for streams with dsl', async () => {
        const indexName = 'logs.dslnostats';
        await putStream(apiClient, indexName, {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [],
              },
              lifecycle: { dsl: { data_retention: '1d' } },
            },
          },
        });
        await getIlmStats(apiClient, indexName, 400);
      });

      if (!isServerless) {
        it('returns not found when the policy does not exist', async () => {
          const indexName = 'logs.ilmpolicydontexists';
          await putStream(apiClient, indexName, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  fields: {},
                  routing: [],
                },
                lifecycle: { ilm: { policy: 'this-stream-policy-does-not-exist' } },
              },
            },
          });
          await getIlmStats(apiClient, indexName, 404);
        });

        it('returns the effective ilm phases', async () => {
          const indexName = 'logs.ilmwithphases';
          const policyName = 'streams_ilm_hotwarmdelete';
          await esClient.ilm.putLifecycle({
            name: policyName,
            policy: {
              phases: {
                hot: { actions: { rollover: { max_age: '30m' } } },
                warm: { min_age: '5d', actions: {} },
                delete: { min_age: '10d', actions: {} },
              },
            },
          });

          await putStream(apiClient, indexName, {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                ...wiredPutBody.stream.ingest,
                wired: {
                  fields: {},
                  routing: [],
                },
                lifecycle: { ilm: { policy: policyName } },
              },
            },
          });

          const stats = await getIlmStats(apiClient, indexName, 200);
          rawExpect(stats).toEqual({
            phases: {
              hot: {
                name: 'hot',
                size_in_bytes: rawExpect.any(Number),
                rollover: { max_age: '30m' },
                min_age: '0ms',
              },
              warm: {
                name: 'warm',
                min_age: '5d',
                size_in_bytes: rawExpect.any(Number),
              },
              delete: {
                name: 'delete',
                min_age: '10d',
              },
            },
          });
        });
      }
    });
  });
}

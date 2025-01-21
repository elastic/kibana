/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  InheritedStreamLifecycle,
  WiredReadStreamDefinition,
  WiredStreamConfigDefinition,
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

  async function expectLifecycle(streams: string[], expectedLifecycle: InheritedStreamLifecycle) {
    const definitions = await Promise.all(streams.map((stream) => getStream(apiClient, stream)));
    for (const definition of definitions) {
      expect(definition.effective_lifecycle).to.eql(expectedLifecycle);
    }

    const dataStreams = await esClient.indices.getDataStream({
      name: definitions.map((definition) => definition.name),
    });
    for (const dataStream of dataStreams.data_streams) {
      if (expectedLifecycle.type === 'dlm') {
        expect(dataStream.lifecycle?.data_retention).to.eql(expectedLifecycle.data_retention);
        if (!isServerless) {
          expect(dataStream.prefer_ilm).to.eql(false);
        }
      } else if (expectedLifecycle.type === 'ilm') {
        expect(dataStream.prefer_ilm).to.eql(true);
        expect(dataStream.ilm_policy).to.eql(expectedLifecycle.policy);
      }
    }
  }

  describe('Lifecycle', () => {
    const wiredPutBody: WiredStreamConfigDefinition = {
      ingest: { routing: [], processing: [], wired: { fields: {} } },
    };
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('updates lifecycle', async () => {
      const rootDefinition = await getStream(apiClient, 'logs');

      const response = await putStream(apiClient, 'logs', {
        ingest: {
          ...rootDefinition.stream.ingest,
          lifecycle: { type: 'dlm', data_retention: '999d' },
        },
      } as WiredStreamConfigDefinition);
      expect(response).to.have.property('acknowledged', true);

      const updatedRootDefinition = await getStream(apiClient, 'logs');
      expect((updatedRootDefinition as WiredReadStreamDefinition).stream.ingest.lifecycle).to.eql({
        type: 'dlm',
        data_retention: '999d',
      });
      expect(updatedRootDefinition.effective_lifecycle).to.eql({
        type: 'dlm',
        data_retention: '999d',
        from: 'logs',
      });
    });

    it('inherits dlm', async () => {
      // create two branches, one that inherits from root and
      // another one that overrides the root lifecycle
      await putStream(apiClient, 'logs.inherits.lifecycle', wiredPutBody);
      await putStream(apiClient, 'logs.overrides.lifecycle', wiredPutBody);

      const rootDefinition = await getStream(apiClient, 'logs');
      await putStream(apiClient, 'logs', {
        ingest: {
          ...rootDefinition.stream.ingest,
          lifecycle: { type: 'dlm', data_retention: '10m' },
        },
      } as WiredStreamConfigDefinition);
      await putStream(apiClient, 'logs.overrides', {
        ingest: {
          ...wiredPutBody.ingest,
          routing: [{ name: 'logs.overrides.lifecycle' }],
          lifecycle: { type: 'dlm', data_retention: '1d' },
        },
      });

      await expectLifecycle(['logs.inherits', 'logs.inherits.lifecycle'], {
        type: 'dlm',
        data_retention: '10m',
        from: 'logs',
      });

      await expectLifecycle(['logs.overrides', 'logs.overrides.lifecycle'], {
        type: 'dlm',
        data_retention: '1d',
        from: 'logs.overrides',
      });
    });

    it('applies the nearest parent lifecycle when deleted', async () => {
      await putStream(apiClient, 'logs.10d', {
        ingest: { ...wiredPutBody.ingest, lifecycle: { type: 'dlm', data_retention: '10d' } },
      });
      await putStream(apiClient, 'logs.10d.20d', {
        ingest: { ...wiredPutBody.ingest, lifecycle: { type: 'dlm', data_retention: '20d' } },
      });
      await putStream(apiClient, 'logs.10d.20d.inherits', wiredPutBody);

      // delete lifecycle of the 20d override
      await putStream(apiClient, 'logs.10d.20d', {
        ingest: {
          ...wiredPutBody.ingest,
          routing: [{ name: 'logs.10d.20d.inherits' }],
        },
      });

      await expectLifecycle(['logs.10d', 'logs.10d.20d', 'logs.10d.20d.inherits'], {
        type: 'dlm',
        data_retention: '10d',
        from: 'logs.10d',
      });
    });

    if (isServerless) {
      it('does not support ilm', async () => {
        await putStream(
          apiClient,
          'logs.ilm',
          {
            ingest: {
              ...wiredPutBody.ingest,
              lifecycle: {
                type: 'ilm',
                policy: 'my-policy',
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
          ingest: {
            ...wiredPutBody.ingest,
            routing: [{ name: 'logs.ilm.stream' }],
            lifecycle: {
              type: 'ilm',
              policy: 'my-policy',
            },
          },
        });

        await expectLifecycle(['logs.ilm', 'logs.ilm.stream'], {
          type: 'ilm',
          policy: 'my-policy',
          from: 'logs.ilm',
        });
      });
    }
  });
}

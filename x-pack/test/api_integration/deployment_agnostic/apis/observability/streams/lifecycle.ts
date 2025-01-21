/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WiredReadStreamDefinition, WiredStreamConfigDefinition } from '@kbn/streams-schema';
import { disableStreams, enableStreams, putStream, getStream } from './helpers/requests';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const config = getService('config');
  const roleScopedSupertest = getService('roleScopedSupertest');

  const isServerless = !!config.get('serverless');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Lifecycle', () => {
    const wiredPutBody: WiredStreamConfigDefinition = {
      ingest: {
        routing: [],
        processing: [],
        wired: { fields: {} },
      },
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

      await Promise.all([
        getStream(apiClient, 'logs.inherits'),
        getStream(apiClient, 'logs.inherits.lifecycle'),
      ]).then((definitions) => {
        for (const definition of definitions) {
          expect(definition.effective_lifecycle).to.eql({
            type: 'dlm',
            data_retention: '10m',
            from: 'logs',
          });
        }
      });

      await Promise.all([
        getStream(apiClient, 'logs.overrides'),
        getStream(apiClient, 'logs.overrides.lifecycle'),
      ]).then((definitions) => {
        for (const definition of definitions) {
          expect(definition.effective_lifecycle).to.eql({
            type: 'dlm',
            data_retention: '1d',
            from: 'logs.overrides',
          });
        }
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

        await Promise.all([
          getStream(apiClient, 'logs.ilm'),
          getStream(apiClient, 'logs.ilm.stream'),
        ]).then((definitions) => {
          for (const definition of definitions) {
            expect(definition.effective_lifecycle).to.eql({
              type: 'ilm',
              policy: 'my-policy',
              from: 'logs.ilm',
            });
          }
        });
      });
    }
  });
}

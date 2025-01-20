/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WiredStreamConfigDefinition, WiredStreamDefinition } from '@kbn/streams-schema';
import { disableStreams, enableStreams, putStream, getStream } from './helpers/requests';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Lifecycle', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('updates lifecycle', async () => {
      const rootStream = await getStream(apiClient, 'logs');

      const response = await putStream(apiClient, 'logs', {
        ingest: {
          ...rootStream.stream.ingest,
          lifecycle: { type: 'dlm', data_retention: '999d' },
        },
      } as WiredStreamConfigDefinition);
      expect(response).to.have.property('acknowledged', true);

      const updatedRootStream = await getStream(apiClient, 'logs');
      expect((updatedRootStream as WiredStreamDefinition).stream.ingest.lifecycle).to.eql({
        type: 'dlm',
        data_retention: '999d',
      });
      expect(updatedRootStream.effective_lifecycle).to.eql({
        type: 'dlm',
        data_retention: '999d',
        from: 'logs',
      });
    });

    it('inherits lifecycle', async () => {
      const rootStream = await getStream(apiClient, 'logs');

      const putBody = {
        ingest: {
          routing: [],
          processing: [],
          wired: { fields: {} },
        },
      };
      // create two branches, one that inherits from root and
      // another one that overrides the root lifecycle
      await putStream(apiClient, 'logs.inherits.lifecycle', putBody);
      await putStream(apiClient, 'logs.overrides.lifecycle', putBody);

      await putStream(apiClient, 'logs', {
        ingest: {
          ...rootStream.stream.ingest,
          lifecycle: { type: 'dlm', data_retention: '10m' },
        },
      } as WiredStreamConfigDefinition);
      await putStream(apiClient, 'logs.overrides', {
        ingest: {
          ...putBody.ingest,
          lifecycle: { type: 'dlm', data_retention: '1d' },
        },
      });

      await Promise.all([
        getStream(apiClient, 'logs.inherits'),
        getStream(apiClient, 'logs.inherits.lifecycle'),
      ]).then((streams) => {
        for (const stream of streams) {
          expect(stream.effective_lifecycle).to.eql({
            type: 'dlm',
            data_retention: '10m',
            from: 'logs',
          });
        }
      });

      await Promise.all([
        getStream(apiClient, 'logs.overrides'),
        getStream(apiClient, 'logs.overrides.lifecycle'),
      ]).then((streams) => {
        for (const stream of streams) {
          expect(stream.effective_lifecycle).to.eql({
            type: 'dlm',
            data_retention: '1d',
            from: 'logs.overrides',
          });
        }
      });
    });
  });
}

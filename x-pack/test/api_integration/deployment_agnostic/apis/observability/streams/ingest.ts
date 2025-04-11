/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WiredIngest, WiredIngestUpsertRequest } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { createStreams } from './helpers/create_streams';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams, getIngest, putIngest } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let apiClient: StreamsSupertestRepositoryClient;

  const updateRequest: WiredIngestUpsertRequest = {
    ingest: {
      lifecycle: { inherit: {} },
      processing: [],
      wired: {
        routing: [],
        fields: {
          newfield: {
            type: 'keyword',
          },
          anothernewfield: {
            type: 'long',
          },
        },
      },
    },
  };

  describe('_ingest API', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await createStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('unsuccessfully updates IngestStream when inexistant', async () => {
      await putIngest(apiClient, 'inexistant', updateRequest, 404);
    });

    it('successfully updates IngestStream', async () => {
      const initialIngest = await getIngest(apiClient, 'logs.test');
      expect((initialIngest.ingest as WiredIngest).wired.fields).not.to.have.property('newfield');
      expect((initialIngest.ingest as WiredIngest).wired.fields).not.to.have.property(
        'anothernewfield'
      );

      await putIngest(apiClient, 'logs.test', updateRequest);

      const updatedIngest = await getIngest(apiClient, 'logs.test');
      expect((updatedIngest.ingest as WiredIngest).wired.fields).to.have.property('newfield');
      expect((updatedIngest.ingest as WiredIngest).wired.fields).to.have.property(
        'anothernewfield'
      );
    });
  });
}

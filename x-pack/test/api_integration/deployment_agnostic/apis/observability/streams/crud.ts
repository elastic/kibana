/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WiredIngestUpsertRequest } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
  createStreamsRepositoryCustomRoleClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams, getStream, putStream } from './helpers/requests';

const STREAM_NAME = 'logs.crud';
const stream: WiredIngestUpsertRequest = {
  ingest: {
    lifecycle: { inherit: {} },
    processing: [],
    wired: {
      routing: [],
      fields: {
        numberfield: {
          type: 'long',
        },
      },
    },
  },
};
export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const samlAuth = getService('samlAuth');

  let adminApiClient: StreamsSupertestRepositoryClient;
  let customRoleApiClient: StreamsSupertestRepositoryClient;

  describe('CRUD', () => {
    before(async () => {
      await samlAuth.setCustomRole({
        elasticsearch: {
          indices: [
            {
              names: ['irrelevant'],
              privileges: ['read', 'view_index_metadata'],
            },
          ],
        },
        kibana: [
          {
            feature: { discover: ['read'] },
            spaces: ['*'],
          },
        ],
      });

      adminApiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      customRoleApiClient = await createStreamsRepositoryCustomRoleClient(roleScopedSupertest);
      await enableStreams(adminApiClient);
    });

    after(async () => {
      await disableStreams(adminApiClient);
      await samlAuth.deleteCustomRole();
    });

    beforeEach(async () => {
      await putStream(adminApiClient, STREAM_NAME, {
        stream,
        dashboards: [],
        queries: [],
      });
    });

    describe('read streams', () => {
      it('fails when users has not read access', async () => {
        await getStream(customRoleApiClient, STREAM_NAME, 403);
      });
    });
  });
}

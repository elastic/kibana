/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/apis/streams/helpers/repository_client';
import {
  createStreamsRepositoryAdminClient,
  createStreamsRepositoryCustomRoleClient,
} from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/apis/streams/helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  getStream,
  putStream,
} from '@kbn/test-suites-xpack-platform/api_integration_deployment_agnostic/apis/streams/helpers/requests';

const STREAM_NAME = 'logs.crud';
const request: Streams.WiredStream.UpsertRequest = {
  dashboards: [],
  queries: [],
  stream: {
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: {
        steps: [],
      },
      wired: {
        routing: [],
        fields: {
          'attributes.numberfield': {
            type: 'long',
          },
        },
      },
    },
  },
};
export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const customRoleScopedSupertest = getService('customRoleScopedSupertest');
  const samlAuth = getService('samlAuth');

  let adminApiClient: StreamsSupertestRepositoryClient;
  let customRoleApiClient: StreamsSupertestRepositoryClient;

  describe('Read privilege', () => {
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
      customRoleApiClient = await createStreamsRepositoryCustomRoleClient(
        customRoleScopedSupertest
      );
      await enableStreams(adminApiClient);
    });

    after(async () => {
      await disableStreams(adminApiClient);
      await samlAuth.deleteCustomRole();
    });

    beforeEach(async () => {
      await putStream(adminApiClient, STREAM_NAME, request);
    });

    describe('Get streams', () => {
      it('fails when users has not read access', async () => {
        await getStream(customRoleApiClient, STREAM_NAME, 403);
      });

      it('succeed when users has read access', async () => {
        await getStream(adminApiClient, STREAM_NAME, 200);
      });
    });
  });
}

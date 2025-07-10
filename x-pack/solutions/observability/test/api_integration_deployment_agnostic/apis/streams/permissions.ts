/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
  createStreamsRepositoryEditorClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams, forkStream } from './helpers/requests';

export const ROLES = {
  missing_ingest_pipeline: {
    elasticsearch: {
      cluster: ['monitor'],
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          streams: ['all'],
        },
      },
    ],
  },
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let adminApiClient: StreamsSupertestRepositoryClient;
  let editorApiClient: StreamsSupertestRepositoryClient;

  describe('Fails on missing permissions', () => {
    before(async () => {
      adminApiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      editorApiClient = await createStreamsRepositoryEditorClient(roleScopedSupertest);
      await enableStreams(adminApiClient);
      await forkStream(adminApiClient, 'logs', {
        stream: {
          name: 'logs.forked',
        },
        if: { always: {} },
      });
    });

    after(async () => {
      await disableStreams(adminApiClient);
    });

    it('cannot fork a stream with editor permissions', async () => {
      const response = await editorApiClient
        .fetch('POST /api/streams/{name}/_fork 2023-10-31', {
          params: {
            path: { name: 'logs' },
            body: {
              stream: {
                name: 'logs.forked2',
              },
              if: { always: {} },
            },
          },
        })
        .expect(403);

      // make sure that the right permissions are validated
      expect(response.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: 'User does not have sufficient permissions to execute these actions',
        attributes: {
          data: {
            permissions: {
              username: 'elastic_editor',
              has_all_requested: false,
              cluster: {
                manage_index_templates: false,
                manage_pipeline: false,
              },
              index: {
                'logs.forked2': {
                  create_index: false,
                  manage: false,
                  manage_data_stream_lifecycle: false,
                  manage_ilm: false,
                },
              },
              application: {},
            },
          },
        },
      });
    });

    it('cannot change lifecycle as an editor', async () => {
      const response = await editorApiClient
        .fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
          params: {
            path: { name: 'logs.forked' },
            body: {
              ingest: {
                lifecycle: {
                  dsl: {
                    data_retention: '5d',
                  },
                },
                processing: [],
                wired: {
                  fields: {},
                  routing: [],
                },
              },
            },
          },
        })
        .expect(403);

      // make sure that the right permissions are validated
      expect(response.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: 'User does not have sufficient permissions to execute these actions',
        attributes: {
          data: {
            permissions: {
              username: 'elastic_editor',
              has_all_requested: false,
              cluster: {},
              index: {
                'logs.forked': {
                  manage: false,
                  manage_data_stream_lifecycle: false,
                  manage_ilm: false,
                },
              },
              application: {},
            },
          },
        },
      });
    });

    it('cannot delete stream as an editor', async () => {
      const response = await editorApiClient
        .fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: {
            path: { name: 'logs.forked' },
          },
        })
        .expect(403);

      // make sure that the right permissions are validated
      expect(response.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: 'User does not have sufficient permissions to execute these actions',
        attributes: {
          data: {
            permissions: {
              username: 'elastic_editor',
              has_all_requested: false,
              cluster: {
                manage_index_templates: false,
                manage_pipeline: false,
              },
              index: {
                'logs.forked': {
                  delete_index: false,
                },
              },
              application: {},
            },
          },
        },
      });
    });
  });
}

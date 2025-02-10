/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams } from './helpers/requests';
import { createStreams } from './helpers/create_streams';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let apiClient: StreamsSupertestRepositoryClient;

  // An anticipated use case is that a user will want to flush a tree of streams from a config file
  describe('GroupStreamDefinition', () => {
    describe('CRUD API Operations', () => {
      before(async () => {
        apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
        await enableStreams(apiClient);
        await createStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it('successfully creates a GroupStream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: {
                    members: ['logs', 'logs.test2'],
                  },
                },
                dashboards: [],
              },
            },
          })
          .expect(200)
          .then((response) => expect(response.body.acknowledged).to.eql(true));
      });

      it('successfully creates a second GroupStream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}', {
            params: {
              path: { name: 'test-group-too' },
              body: {
                stream: {
                  group: {
                    members: ['logs.test2'],
                  },
                },
                dashboards: [],
              },
            },
          })
          .expect(200)
          .then((response) => expect(response.body.acknowledged).to.eql(true));
      });

      it('unsuccessfully updates a GroupStream with an uknown stream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: {
                    members: ['logs', 'non-existent-stream'],
                  },
                },
                dashboards: [],
              },
            },
          })
          .expect(404);
      });

      it('unsuccessfully updates a GroupStream with an itself as a member', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: {
                    members: ['logs', 'test-group'],
                  },
                },
                dashboards: [],
              },
            },
          })
          .expect(400);
      });

      it('unsuccessfully updates a GroupStream with a forbidden member', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: {
                    members: ['logs', 'test-group-too'],
                  },
                },
                dashboards: [],
              },
            },
          })
          .expect(400);
      });

      it('successfully deletes a GroupStream', async () => {
        await apiClient
          .fetch('DELETE /api/streams/{name}', {
            params: {
              path: { name: 'test-group-too' },
            },
          })
          .expect(200);
      });

      it('successfully reads a GroupStream', async () => {
        const response = await apiClient
          .fetch('GET /api/streams/{name}', {
            params: {
              path: { name: 'test-group' },
            },
          })
          .expect(200);
        expect(response.body).to.eql({
          stream: {
            name: 'test-group',
            group: {
              members: ['logs', 'logs.test2'],
            },
          },
          dashboards: [],
        });
      });

      it('successfully lists a GroupStream', async () => {
        const response = await apiClient.fetch('GET /api/streams').expect(200);
        expect(response.body.streams.some((stream) => stream.name === 'test-group')).to.eql(true);
      });
    });
  });
}

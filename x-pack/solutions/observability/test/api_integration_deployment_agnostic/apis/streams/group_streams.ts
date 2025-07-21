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
} from './helpers/repository_client';
import { disableStreams, enableStreams } from './helpers/requests';
import { createStreams } from './helpers/create_streams';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

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
        await esClient.indices.deleteDataStream({ name: 'metrics-test-test' });
      });

      it('successfully creates a GroupStream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  description: 'Test group description',
                  group: {
                    members: ['logs', 'logs.test2', 'logs'],
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(200)
          .then((response) => expect(response.body.acknowledged).to.eql(true));
      });

      it('successfully creates a second GroupStream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group-too' },
              body: {
                stream: {
                  description: '',
                  group: {
                    members: ['logs.test2'],
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(200)
          .then((response) => expect(response.body.acknowledged).to.eql(true));
      });

      it('unsuccessfully updates a GroupStream with an uknown stream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  description: 'Test group description',
                  group: {
                    members: ['logs', 'non-existent-stream'],
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });

      it('unsuccessfully updates a GroupStream with an itself as a member', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  description: '',
                  group: {
                    members: ['logs', 'test-group'],
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });

      it('unsuccessfully updates a GroupStream with a forbidden member', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  description: 'Test group description',
                  group: {
                    members: ['logs', 'test-group-too'],
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });

      it('successfully deletes a GroupStream', async () => {
        await apiClient
          .fetch('DELETE /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group-too' },
            },
          })
          .expect(200);
      });

      it('successfully reads a GroupStream', async () => {
        const response = await apiClient
          .fetch('GET /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
            },
          })
          .expect(200);
        expect(response.body).to.eql({
          stream: {
            name: 'test-group',
            description: 'Test group description',
            group: {
              members: ['logs', 'logs.test2'],
            },
          },
          dashboards: [],
          queries: [],
        });
      });

      it('fails when trying to update a non-existing GroupStream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}/_group 2023-10-31', {
            params: {
              path: { name: 'test-group-3' },
              body: {
                group: {
                  members: ['logs.test2'],
                },
              },
            },
          })
          .expect(404);
      });

      it('successfully reads a GroupStream from _group', async () => {
        const response = await apiClient
          .fetch('GET /api/streams/{name}/_group 2023-10-31', {
            params: {
              path: { name: 'test-group' },
            },
          })
          .expect(200);
        expect(response.body).to.eql({
          group: {
            members: ['logs', 'logs.test2'],
          },
        });
      });

      it('successfully lists a GroupStream', async () => {
        const response = await apiClient.fetch('GET /api/streams 2023-10-31').expect(200);
        expect(response.body.streams.some((stream) => stream.name === 'test-group')).to.eql(true);
      });

      it('unsuccessfully creates a group stream with the same name as a unwired stream', async () => {
        await esClient.index({ index: 'metrics-test-test', document: { '@timestamp': '2025' } });
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'metrics-test-test' },
              body: {
                stream: {
                  description: '',
                  group: {
                    members: ['logs'],
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });

      it('unsuccessfully creates a group stream prefixed with logs', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'logs.group' },
              body: {
                stream: {
                  description: '',
                  group: {
                    members: ['logs'],
                  },
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });
    });
  });
}

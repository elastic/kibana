/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GroupStreamDefinition } from '@kbn/streams-schema';
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

  describe('GroupStream', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await createStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('CRUD', () => {
      it('successfully creates a group stream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: createGroupStreamDefinition(['logs']),
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(200);
      });

      it('successfully reads a group stream', async () => {
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
            group: createGroupStreamDefinition(['logs']),
          },
          dashboards: [],
          queries: [],
        });
      });

      it('successfully updates a group stream', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: createGroupStreamDefinition(['logs.test']),
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(200);

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
            group: createGroupStreamDefinition(['logs.test']),
          },
          dashboards: [],
          queries: [],
        });
      });

      it('successfully deletes a group stream', async () => {
        await apiClient
          .fetch('DELETE /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
            },
          })
          .expect(200);
      });
    });

    describe('validations', () => {
      it('allows group streams to reference group streams', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: createGroupStreamDefinition(['logs', 'logs.test']),
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(200);

        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'dependent-group' },
              body: {
                stream: {
                  group: createGroupStreamDefinition(['test-group']),
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(200);
      });

      it('cannot be deleted if another group stream depends on it', async () => {
        await apiClient
          .fetch('DELETE /api/streams/{name} 2023-10-31', {
            params: {
              path: {
                name: 'test-group',
              },
            },
          })
          .expect(400);
      });

      it('stops related streams from being deleted', async () => {
        await apiClient
          .fetch('DELETE /api/streams/{name} 2023-10-31', {
            params: {
              path: {
                name: 'logs.test',
              },
            },
          })
          .expect(400);
      });

      it('cannot create a group stream with itself as a member', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: createGroupStreamDefinition(['test-group']),
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });

      it('cannot create a group stream with an unknown member', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: createGroupStreamDefinition(['non-existent-stream']),
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });

      it('cannot create a group stream with duplicated relationships', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                stream: {
                  group: createGroupStreamDefinition(['logs', 'logs']),
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });

      it('cannot create a group stream prefixed with logs.', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: 'logs.group' },
              body: {
                stream: {
                  group: createGroupStreamDefinition(['logs']),
                },
                dashboards: [],
                queries: [],
              },
            },
          })
          .expect(400);
      });
    });

    describe('_group endpoint', () => {
      it('successfully upserts', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}/_group 2023-10-31', {
            params: {
              path: { name: 'test-group' },
              body: {
                group: createGroupStreamDefinition(['logs.test2']),
              },
            },
          })
          .expect(200);
      });

      it('successfully reads', async () => {
        const response = await apiClient
          .fetch('GET /api/streams/{name}/_group 2023-10-31', {
            params: {
              path: { name: 'test-group' },
            },
          })
          .expect(200);

        expect(response.body).to.eql({
          group: createGroupStreamDefinition(['logs.test2']),
        });
      });
    });

    describe('when listing streams', () => {
      it('should be included in the streams list', async () => {
        const response = await apiClient.fetch('GET /api/streams 2023-10-31').expect(200);
        expect(response.body.streams.some((stream) => stream.name === 'test-group')).to.eql(true);
      });
    });
  });
}

function createGroupStreamDefinition(members: string[]) {
  return {
    category: 'test',
    owner: 'test_user',
    tier: 1,
    tags: [],
    relationships: members.map((name) => ({
      name,
      type: 'member',
    })),
    documentation_links: [],
    repository_links: [],
    runbook_links: [],
  } as GroupStreamDefinition['group'];
}

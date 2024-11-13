/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import expect from '@kbn/expect';
import type { Agent } from 'supertest';
import { ApiMessageCode } from '@kbn/cloud-security-posture-common/types/graph/latest';
import type { GraphRequest } from '@kbn/cloud-security-posture-common/types/graph/latest';
import { FtrProviderContext } from '../ftr_provider_context';
import { result } from '../utils';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const cspSecurity = CspSecurityCommonProvider(providerContext);

  const postGraph = (agent: Agent, body: GraphRequest, auth?: { user: string; pass: string }) => {
    const req = agent
      .post('/internal/cloud_security_posture/graph')
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'xxxx');

    if (auth) {
      req.auth(auth.user, auth.pass);
    }

    return req.send(body);
  };

  describe('POST /internal/cloud_security_posture/graph', () => {
    describe('Authorization', () => {
      it('should return 403 for user without read access', async () => {
        await postGraph(
          supertestWithoutAuth,
          {
            query: {
              eventIds: [],
              start: 'now-1d/d',
              end: 'now/d',
            },
          },
          {
            user: 'role_security_no_read_user',
            pass: cspSecurity.getPasswordForUser('role_security_no_read_user'),
          }
        ).expect(result(403, logger));
      });
    });

    describe('Happy flows', () => {
      before(async () => {
        await esArchiver.loadIfNeeded(
          'x-pack/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
        );
      });

      describe('Validation', () => {
        it('should return 400 when missing `eventIds` field', async () => {
          await postGraph(supertest, {
            // @ts-expect-error ignore error for testing
            query: {
              start: 'now-1d/d',
              end: 'now/d',
            },
          }).expect(result(400, logger));
        });

        it('should return 400 when missing `esQuery` field is not of type bool', async () => {
          await postGraph(supertest, {
            query: {
              eventIds: [],
              start: 'now-1d/d',
              end: 'now/d',
              esQuery: {
                // @ts-expect-error ignore error for testing
                match_all: {},
              },
            },
          }).expect(result(400, logger));
        });

        it('should return 400 with unsupported `esQuery`', async () => {
          await postGraph(supertest, {
            query: {
              eventIds: [],
              start: 'now-1d/d',
              end: 'now/d',
              esQuery: {
                bool: {
                  filter: [
                    {
                      unsupported: 'unsupported',
                    },
                  ],
                },
              },
            },
          }).expect(result(400, logger));
        });
      });

      it('should return an empty graph / should return 200 when missing `esQuery` field', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: [],
            start: 'now-1d/d',
            end: 'now/d',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(0);
        expect(response.body).to.have.property('edges').length(0);
        expect(response.body).not.to.have.property('messages');
      });

      it('should return a graph with nodes and edges by actor', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'actor.entity.id': 'admin@example.com',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: any) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
        });

        response.body.edges.forEach((edge: any) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'primary',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
        });
      });

      it('should return a graph with nodes and edges by alert', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: ['kabcd1234efgh5678'],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: any) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'danger',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
        });

        response.body.edges.forEach((edge: any) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'danger',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
        });
      });

      it('color of alert of failed event should be danger', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: ['failed-event'],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: any) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'danger',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
        });

        response.body.edges.forEach((edge: any) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'danger',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
        });
      });

      it('color of event of failed event should be warning', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'actor.entity.id': 'admin2@example.com',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: any) => {
          expect(node).to.have.property('color');

          expect(node.color).equal(
            node.shape === 'label' ? 'warning' : 'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
        });

        response.body.edges.forEach((edge: any) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'warning',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
        });
      });

      it('2 grouped events, 1 failed, 1 success', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'actor.entity.id': 'admin3@example.com',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(5);
        expect(response.body).to.have.property('edges').length(6);
        expect(response.body).not.to.have.property('messages');

        expect(response.body.nodes[0].shape).equal('group', 'Groups should be the first nodes');

        response.body.nodes.forEach((node: any) => {
          if (node.shape !== 'group') {
            expect(node).to.have.property('color');
            expect(node.color).equal(
              node.shape === 'label' && node.id.includes('outcome(failed)') ? 'warning' : 'primary',
              `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
            );
          }
        });

        response.body.edges.forEach((edge: any) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            edge.id.includes('outcome(failed)') ||
              (edge.id.includes('grp(') && !edge.id.includes('outcome(success)'))
              ? 'warning'
              : 'primary',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
        });
      });

      it('should support more than 1 eventIds', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: ['kabcd1234efgh5678', 'failed-event'],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(5);
        expect(response.body).to.have.property('edges').length(4);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: any) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'danger',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
        });

        response.body.edges.forEach((edge: any) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'danger',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
        });
      });

      it('should return a graph with nodes and edges by alert and actor', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: ['kabcd1234efgh5678'],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'actor.entity.id': 'admin2@example.com',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(5);
        expect(response.body).to.have.property('edges').length(4);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: any, idx: number) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            idx <= 2 // First 3 nodes are expected to be colored as danger (ORDER MATTERS, alerts are expected to be first)
              ? 'danger'
              : node.shape === 'label' && node.id.includes('outcome(failed)')
              ? 'warning'
              : 'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
        });

        response.body.edges.forEach((edge: any, idx: number) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            idx <= 1 ? 'danger' : 'warning',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
        });
      });

      it('should filter unknown targets', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'actor.entity.id': 'admin5@example.com',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(0);
        expect(response.body).to.have.property('edges').length(0);
        expect(response.body).not.to.have.property('messages');
      });

      it('should return unknown targets', async () => {
        const response = await postGraph(supertest, {
          showUnknownTarget: true,
          query: {
            eventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'actor.entity.id': 'admin5@example.com',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');
      });

      it('should limit number of nodes', async () => {
        const response = await postGraph(supertest, {
          nodesLimit: 1,
          query: {
            eventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    exists: {
                      field: 'actor.entity.id',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3); // Minimal number of nodes in a single relationship
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).to.have.property('messages').length(1);
        expect(response.body.messages[0]).equal(ApiMessageCode.ReachedNodesLimit);
      });

      it('should support date math', async () => {
        const response = await postGraph(supertest, {
          query: {
            eventIds: ['kabcd1234efgh5678'],
            start: '2024-09-01T12:30:00.000Z||-30m',
            end: '2024-09-01T12:30:00.000Z||+30m',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');
      });
    });
  });
}

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
import type {
  GraphRequest,
  NodeDataModel,
  EntityNodeDataModel,
  LabelNodeDataModel,
  EdgeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import { FtrProviderContext } from '../ftr_provider_context';
import { result } from '../utils';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const es = getService('es');
  const logger = getService('log');
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const cspSecurity = CspSecurityCommonProvider(providerContext);

  const postGraph = (
    agent: Agent,
    body: GraphRequest,
    auth?: { user: string; pass: string },
    spaceId?: string
  ) => {
    logger.debug(`POST ${spaceId ? `/s/${spaceId}` : ''}/internal/cloud_security_posture/graph`);
    let req = agent
      .post(`${spaceId ? `/s/${spaceId}` : ''}/internal/cloud_security_posture/graph`)
      .set(ELASTIC_HTTP_VERSION_HEADER, '1')
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .set('kbn-xsrf', 'xxxx');

    if (auth) {
      req = req.auth(auth.user, auth.pass);
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
              originEventIds: [],
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

    describe('Validation', () => {
      it('should return 400 when missing `originEventIds` field', async () => {
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
            originEventIds: [],
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
            originEventIds: [],
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

      it('should return 400 when index patterns is an empty array', async () => {
        await postGraph(supertest, {
          query: {
            originEventIds: [],
            start: 'now-1d/d',
            end: 'now/d',
            indexPatterns: [],
          },
        }).expect(result(400, logger));
      });

      it('should return 400 when index patterns has empty string value', async () => {
        await postGraph(supertest, {
          query: {
            originEventIds: [],
            start: 'now-1d/d',
            end: 'now/d',
            indexPatterns: ['logs-*', ''],
          },
        }).expect(result(400, logger));
      });

      it('should return 400 when index patterns has illegal character (space, |)', async () => {
        await postGraph(supertest, {
          query: {
            originEventIds: [],
            start: 'now-1d/d',
            end: 'now/d',
            indexPatterns: ['logs-*', '.alerts-security-*| FROM *'],
          },
        }).expect(result(400, logger));
      });

      it('should return 500 when space id is invalid', async () => {
        await postGraph(
          supertest,
          {
            query: {
              originEventIds: [],
              start: 'now-1d/d',
              end: 'now/d',
            },
          },
          undefined,
          encodeURIComponent('foo | FROM *').replace('*', '%2A')
        ).expect(result(500, logger));
      });

      it('should return 400 when index pattern contains illegal characters', async () => {
        await postGraph(supertest, {
          query: {
            indexPatterns: ['foo | FROM *'],
            originEventIds: [],
            start: 'now-1d/d',
            end: 'now/d',
          },
        }).expect(result(400, logger));
      });
    });

    describe('Happy flows', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/security_alerts'
        );
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
        );
        await spacesService.create({
          id: 'foo',
          name: 'foo',
          disabledFeatures: [],
        });
      });

      after(async () => {
        // Using unload destroys index's alias of .alerts-security.alerts-default which causes a failure in other tests
        // Instead we delete all alerts from the index
        await es.deleteByQuery({
          index: '.internal.alerts-*',
          query: { match_all: {} },
          conflicts: 'proceed',
        });
        await esArchiver.unload(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
        );
        await spacesService.delete('foo');
      });

      it('should return an empty graph / should return 200 when missing `esQuery` field', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [],
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
            indexPatterns: ['logs-*'],
            originEventIds: [],
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
                must_not: [
                  {
                    match_phrase: {
                      'event.action': 'google.iam.admin.v1.UpdateRole',
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

        response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );

          if (node.shape === 'label') {
            expect(node.documentsData).to.have.length(1);
            expect(node.documentsData?.[0]).to.have.property(
              'type',
              node.shape === 'label' ? 'event' : 'entity'
            );
          }
        });

        response.body.edges.forEach((edge: EdgeDataModel) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'subdued',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('should return a graph with nodes and edges by alert', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: true }],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            node.shape === 'label' ? 'danger' : 'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );

          if (node.shape === 'label') {
            expect(node.documentsData).to.have.length(1);
            expect(node.documentsData?.[0]).to.have.property(
              'type',
              node.shape === 'label' ? 'event' : 'entity'
            );
          }
        });

        response.body.edges.forEach((edge: EdgeDataModel) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'danger',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('should return a graph with nodes and edges by origin event', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: false }],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
          if (node.shape === 'label') {
            expect(node.documentsData).to.have.length(1);
            expect(node.documentsData?.[0]).to.have.property(
              'type',
              node.shape === 'label' ? 'event' : 'entity'
            );
          }
        });

        response.body.edges.forEach((edge: EdgeDataModel) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'subdued',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('color of alert of failed event should be danger', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [{ id: 'failed-event', isAlert: true }],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            node.shape === 'label' ? 'danger' : 'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
          if (node.shape === 'label') {
            expect(node.documentsData).to.have.length(1);
            expect(node.documentsData?.[0]).to.have.property(
              'type',
              node.shape === 'label' ? 'event' : 'entity'
            );
          }
        });

        response.body.edges.forEach((edge: EdgeDataModel) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'danger',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('color of event of failed event should be primary', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [],
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

        response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
          if (node.shape === 'label') {
            expect(node.documentsData).to.have.length(1);
            expect(node.documentsData?.[0]).to.have.property(
              'type',
              node.shape === 'label' ? 'event' : 'entity'
            );
          }
        });

        response.body.edges.forEach((edge: EdgeDataModel) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'subdued',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('2 grouped events', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [],
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

        expect(response.body).to.have.property('nodes').length(5);
        expect(response.body).to.have.property('edges').length(6);
        expect(response.body).not.to.have.property('messages');

        expect(response.body.nodes[0].shape).equal('group', 'Groups should be the first nodes');

        response.body.nodes.forEach((node: NodeDataModel) => {
          if (node.shape !== 'group') {
            expect(node).to.have.property('color');
            expect(node.color).equal(
              'primary',
              `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
            );
            if (node.shape === 'label') {
              expect(node.documentsData).to.have.length(1);
              expect(node.documentsData?.[0]).to.have.property(
                'type',
                node.shape === 'label' ? 'event' : 'entity'
              );
            }
          }
        });

        response.body.edges.forEach((edge: EdgeDataModel) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'subdued',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('should support more than 1 originEventIds', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [
              { id: 'kabcd1234efgh5678', isAlert: true },
              { id: 'failed-event', isAlert: true },
            ],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(5);
        expect(response.body).to.have.property('edges').length(4);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            node.shape === 'label' ? 'danger' : 'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
          if (node.shape === 'label') {
            expect(node.documentsData).to.have.length(1);
            expect(node.documentsData?.[0]).to.have.property(
              'type',
              node.shape === 'label' ? 'event' : 'entity'
            );
          }
        });

        response.body.edges.forEach((edge: EdgeDataModel) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'danger',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('should return a graph with nodes and edges by alert and actor', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: true }],
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

        response.body.nodes.forEach(
          (node: EntityNodeDataModel | LabelNodeDataModel, idx: number) => {
            expect(node).to.have.property('color');
            expect(node.color).equal(
              idx === 2 // Only the label should be marked as danger (ORDER MATTERS, alerts are expected to be first)
                ? 'danger'
                : 'primary',
              `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
            );
            if (node.shape === 'label') {
              expect(node.documentsData).to.have.length(1);
              expect(node.documentsData?.[0]).to.have.property(
                'type',
                node.shape === 'label' ? 'event' : 'entity'
              );
            }
          }
        );

        response.body.edges.forEach((edge: EdgeDataModel, idx: number) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            idx <= 1 ? 'danger' : 'subdued',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('should filter unknown targets', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['logs-*'],
            originEventIds: [],
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
            indexPatterns: ['logs-*'],
            originEventIds: [],
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
            indexPatterns: ['logs-*'],
            originEventIds: [],
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
            indexPatterns: ['logs-*'],
            originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: true }],
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

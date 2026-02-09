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
import { expect as expectExpect } from 'expect';
import type { Agent } from 'supertest';
import { ApiMessageCode } from '@kbn/cloud-security-posture-common/types/graph/latest';
import type {
  GraphRequest,
  NodeDataModel,
  EntityNodeDataModel,
  LabelNodeDataModel,
  EdgeDataModel,
} from '@kbn/cloud-security-posture-common/types/graph/latest';
import { isLabelNode } from '@kbn/cloud-security-posture-graph/src/components/utils';
import { getEntitiesLatestIndexName } from '@kbn/cloud-security-posture-common/utils/helpers';
import type { FtrProviderContext } from '../ftr_provider_context';
import {
  result,
  dataViewRouteHelpersFactory,
  waitForEnrichPolicyCreated,
  executeEnrichPolicy,
  installCloudAssetInventoryPackage,
  initEntityEnginesWithRetry,
  waitForEntityDataIndexed,
} from '../utils';
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
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');

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
        // security_alerts_ecs - contains ECS mappings for actor and target
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/security_alerts_ecs'
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

        // Try to unload logs archive - might have been replaced by nested test suites
        try {
          await esArchiver.unload(
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
          );
        } catch (e) {
          // Ignore if already unloaded or replaced by another archive
          logger.debug(`Could not unload logs_gcp_audit: ${e.message}`);
        }

        await spacesService.delete('foo');
      });

      it('should return an empty graph / should return 200 when missing `esQuery` field', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
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
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'user.entity.id': 'admin@example.com',
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

          if (isLabelNode(node)) {
            // Check for both document types flexibly
            const hasAlert = node.documentsData!.some((doc) => doc.type === 'alert');
            const hasEvent = node.documentsData!.some((doc) => doc.type === 'event');
            expect(hasAlert).to.be(true);
            expect(hasEvent).to.be(true);
          }

          if (node.id === 'admin@example.com') {
            expect(node).to.not.be(undefined);
            expect(node!.documentsData).to.not.be(undefined);
            expect(node!.documentsData!.length).to.equal(1);

            expectExpect(node!.documentsData).toContainEqual(
              expectExpect.objectContaining({
                id: 'admin@example.com',
                type: 'entity',
                entity: expectExpect.objectContaining({
                  ecsParentField: 'user',
                  availableInEntityStore: false,
                }),
              })
            );
          }

          if (node.id === 'projects/your-project-id/roles/customRole') {
            expect(node).to.not.be(undefined);
            expect(node!.documentsData).to.not.be(undefined);
            expect(node!.documentsData!.length).to.equal(1);

            expectExpect(node!.documentsData).toContainEqual(
              expectExpect.objectContaining({
                id: 'projects/your-project-id/roles/customRole',
                type: 'entity',
                entity: expectExpect.objectContaining({
                  ecsParentField: 'entity',
                  availableInEntityStore: false,
                }),
              })
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
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
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
            isLabelNode(node) &&
              Number(node.uniqueAlertsCount) > 0 &&
              Number(node.uniqueEventsCount) === 0
              ? 'danger'
              : 'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );

          if (isLabelNode(node)) {
            expect(node.documentsData).to.have.length(2);
            // Check for both document types flexibly
            const hasAlert = node.documentsData!.some((doc) => doc.type === 'alert');
            const hasEvent = node.documentsData!.some((doc) => doc.type === 'event');
            expect(hasAlert).to.be(true);
            expect(hasEvent).to.be(true);
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

      it('should return a graph with nodes and edges by origin event', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
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
            expect(node.documentsData).to.have.length(2);
            // Check document types based on actual content
            const hasAlert = node.documentsData!.some((doc) => doc.type === 'alert');
            const hasEvent = node.documentsData!.some((doc) => doc.type === 'event');
            expect(hasAlert).to.be(true);
            expect(hasEvent).to.be(true);
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

      it('color of alert of failed event should be primary', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
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

      it('color of event of failed event should be primary', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'user.entity.id': 'admin2@example.com',
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
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'user.entity.id': 'admin@example.com',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(5); // 1 group + 2 entities + 2 labels
        expect(response.body).to.have.property('edges').length(6); // actor→group, group→target, group↔label1, group↔label2
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: NodeDataModel) => {
          if (node.shape !== 'group' && node.shape !== 'relationship') {
            expect(node).to.have.property('color');
            expect(node.color).equal(
              'primary',
              `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
            );

            if (node.shape === 'label') {
              // Handle flexible document patterns
              if (node.documentsData && node.documentsData.length === 1) {
                // Single document - check its actual type
                expect(node.documentsData[0]).to.have.property('type');
                // Accept either event or alert as valid
              } else if (node.documentsData && node.documentsData.length === 2) {
                // Two documents - check for both types
                const hasAlert = node.documentsData.some((doc) => doc.type === 'alert');
                const hasEvent = node.documentsData.some((doc) => doc.type === 'event');
                expect(hasAlert).to.be(true);
                expect(hasEvent).to.be(true);
              }
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

      it('handles multi-value actor and target entity IDs with MV_EXPAND - single field', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [{ id: 'multivalue-event-1', isAlert: false }],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        // After MV_EXPAND, the Cartesian product of 2 actors × 3 targets = 6 records
        // These are grouped by MD5 hash into 2 entity nodes (one for actors, one for targets)
        // and 1 label node representing all 6 relationships
        expect(response.body).to.have.property('nodes');
        expect(response.body).to.have.property('edges');

        // Filter entity nodes (non-label nodes) - should be 2 (one actor group, one target group)
        const entityNodes = response.body.nodes.filter(
          (node: NodeDataModel) => node.shape !== 'label'
        );
        expect(entityNodes).to.have.length(
          2,
          'Should have 2 entity nodes (actor and target groups)'
        );

        // Find actor node (should have count: 2 for 2 actor IDs)
        const actorNode = entityNodes.find((node: EntityNodeDataModel) => node.count === 2);
        expect(actorNode).to.not.be(undefined);
        expect(actorNode).to.have.property('shape', 'rectangle');
        expect(actorNode).to.have.property('color', 'primary');
        expect(actorNode).to.have.property('tag', 'Entities');
        expect(actorNode).to.have.property('icon', 'magnifyWithExclamation');
        expect(actorNode.documentsData).to.have.length(2);
        expectExpect(actorNode.documentsData).toContainEqual({
          id: 'actor-mv-1',
          type: 'entity',
          entity: { ecsParentField: 'entity', availableInEntityStore: false },
        });
        expectExpect(actorNode.documentsData).toContainEqual({
          id: 'actor-mv-2',
          type: 'entity',
          entity: { ecsParentField: 'entity', availableInEntityStore: false },
        });

        // Find target node (should have count: 3 for 3 target IDs)
        const targetNode = entityNodes.find((node: EntityNodeDataModel) => node.count === 3);
        expect(targetNode).to.not.be(undefined);
        expect(targetNode).to.have.property('shape', 'rectangle');
        expect(targetNode).to.have.property('color', 'primary');
        expect(targetNode).to.have.property('tag', 'Entities');
        expect(targetNode).to.have.property('icon', 'magnifyWithExclamation');
        expect(targetNode.documentsData).to.have.length(3);
        expectExpect(targetNode.documentsData).toContainEqual({
          id: 'target-mv-1',
          type: 'entity',
          entity: { ecsParentField: 'entity', availableInEntityStore: false },
        });
        expectExpect(targetNode.documentsData).toContainEqual({
          id: 'target-mv-2',
          type: 'entity',
          entity: { ecsParentField: 'entity', availableInEntityStore: false },
        });
        expectExpect(targetNode.documentsData).toContainEqual({
          id: 'target-mv-3',
          type: 'entity',
          entity: { ecsParentField: 'entity', availableInEntityStore: false },
        });

        // Verify label node exists for the action with count of 6 (2 actors × 3 targets)
        const labelNodes = response.body.nodes.filter(
          (node: LabelNodeDataModel) => node.shape === 'label'
        );
        expect(labelNodes).to.have.length(
          1,
          'Should have 1 label node representing all relationships'
        );

        const labelNode = labelNodes[0];
        expect(labelNode).to.have.property('label', 'test.multivalue.action');
        expect(labelNode).to.have.property('color', 'primary');
        expect(labelNode).to.have.property('count', 6); // 2 actors × 3 targets = 6 relationships
        expect(labelNode).to.have.property('uniqueEventsCount', 1); // 1 source event

        // Verify edges connect actor group -> label -> target group
        // Expected: 1 actor->label edge + 1 label->target edge = 2 edges
        expect(response.body.edges).to.have.length(
          2,
          'Should have 2 edges (actor group -> label -> target group)'
        );

        // Verify edge from actor to label
        const actorToLabelEdge = response.body.edges.find(
          (edge: EdgeDataModel) => edge.source === actorNode!.id && edge.target === labelNode.id
        );
        expect(actorToLabelEdge).to.not.be(undefined);
        expect(actorToLabelEdge).to.have.property('color', 'subdued');
        expect(actorToLabelEdge).to.have.property('type', 'solid');

        // Verify edge from label to target
        const labelToTargetEdge = response.body.edges.find(
          (edge: EdgeDataModel) => edge.source === labelNode.id && edge.target === targetNode!.id
        );
        expect(labelToTargetEdge).to.not.be(undefined);
        expect(labelToTargetEdge).to.have.property('color', 'subdued');
        expect(labelToTargetEdge).to.have.property('type', 'solid');
      });

      it('should support more than 1 originEventIds', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [
              { id: 'kabcd1234efgh5678', isAlert: true },
              { id: 'failed-event', isAlert: true },
            ],
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
            isLabelNode(node) &&
              Number(node.uniqueAlertsCount) > 0 &&
              Number(node.uniqueEventsCount) === 0
              ? 'danger'
              : 'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
          if (node.id === 'failed-event') {
            expect(node.documentsData).to.have.length(1);
            expect(node.documentsData?.[0]).to.have.property('type', 'event');
          }
          if (node.id === 'kabcd1234efgh5678') {
            expect(node.documentsData).to.have.length(2);
            expect(node.documentsData?.[0]).to.have.property('type', 'event');
            expect(node.documentsData?.[1]).to.have.property('type', 'alert');
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

      it('should return a graph with nodes and edges by alert and actor', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: true }],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'user.entity.id': 'admin2@example.com',
                    },
                  },
                ],
              },
            },
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(5); // 3 entities + 2 labels
        expect(response.body).to.have.property('edges').length(4); // Simple connections without group
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach(
          (node: EntityNodeDataModel | LabelNodeDataModel, idx: number) => {
            expect(node).to.have.property('color');
            expect(node.color).equal(
              'primary',
              `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
            );
            if (node.shape === 'label') {
              // Some nodes may have different document patterns
              if (node.documentsData && node.documentsData.length === 1) {
                expect(node.documentsData?.[0]).to.have.property('type', 'event');
              } else if (node.documentsData && node.documentsData.length === 2) {
                const hasAlert = node.documentsData.some((doc) => doc.type === 'alert');
                const hasEvent = node.documentsData.some((doc) => doc.type === 'event');
                expect(hasAlert).to.be(true);
                expect(hasEvent).to.be(true);
              }
            }
          }
        );

        response.body.edges.forEach((edge: EdgeDataModel, idx: number) => {
          expect(edge).to.have.property('color');
          expect(edge.color).equal(
            'subdued',
            `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
          );
          expect(edge.type).equal('solid');
        });
      });

      it('should filter unknown targets', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'user.entity.id': 'admin5@example.com',
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
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    match_phrase: {
                      'user.entity.id': 'admin5@example.com',
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
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
            esQuery: {
              bool: {
                filter: [
                  {
                    exists: {
                      field: 'user.entity.id',
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
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: true }],
            start: '2024-09-01T12:30:00.000Z||-30m',
            end: '2024-09-01T12:30:00.000Z||+30m',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');
      });

      it('should return related alerts by default when fetching event', async () => {
        const response = await postGraph(supertest, {
          query: {
            originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: false }],
            start: '2024-09-01T12:30:00.000Z||-30m',
            end: '2024-09-01T12:30:00.000Z||+30m',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            isLabelNode(node) &&
              Number(node.uniqueAlertsCount) > 0 &&
              Number(node.uniqueEventsCount) === 0
              ? 'danger'
              : 'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
          if (node.shape === 'label') {
            expect(node.documentsData).to.have.length(2);
            expectExpect(node.documentsData).toContainEqual(
              expectExpect.objectContaining({
                type: 'alert',
                alert: { ruleName: 'GCP IAM Custom Role Creation' },
              })
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

      it('should return label nodes with correct ID pattern confirming boolean handling', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [
              { id: 'kabcd1234efgh5678', isAlert: true },
              { id: 'failed-event', isAlert: false },
            ],
            start: '2024-09-01T00:00:00Z',
            end: '2024-09-02T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes');

        const labelNodes = response.body.nodes.filter(
          (n: NodeDataModel) => n.shape === 'label'
        ) as LabelNodeDataModel[];

        // Verify we have label nodes to test
        expect(labelNodes.length).to.be.greaterThan(0, 'Should have at least one label node');

        // Verify label node IDs contain the expected pattern oe([01])oa([01])
        // This confirms isOrigin and isOriginAlert booleans are converted to 0/1
        // CRITICAL: If COALESCE(..., false) is missing, events with null event.id
        // would result in isOrigin=null which would break this pattern
        labelNodes.forEach((labelNode: LabelNodeDataModel) => {
          expect(labelNode.id).to.match(
            /oe\([01]\)oa\([01]\)/,
            `Label node ID should contain oe(0|1)oa(0|1) pattern but got: ${labelNode.id}. ` +
              'This pattern validates that isOrigin and isOriginAlert are properly coalesced to boolean values.'
          );
        });

        // At least one label should be from an origin event (oe(1))
        const originLabelNodes = labelNodes.filter((n: LabelNodeDataModel) =>
          n.id.includes('oe(1)')
        );
        expect(originLabelNodes.length).to.be.greaterThan(
          0,
          'Should have at least one label node from origin event'
        );

        // Verify the origin alert label has the correct pattern (oe(1)oa(1))
        const originAlertLabels = labelNodes.filter((n: LabelNodeDataModel) =>
          n.id.includes('oe(1)oa(1)')
        );
        expect(originAlertLabels.length).to.be.greaterThan(
          0,
          'Should have at least one label node from origin alert (kabcd1234efgh5678 is marked as isAlert: true)'
        );
      });

      it('should handle events with null event.id gracefully', async () => {
        // Create a test event with null event.id to test the edge case
        // Use logs-* pattern which is a data stream, requires op_type: 'create'
        const testDataStream = 'logs-test.graph-default';

        const createResponse = await es.index({
          index: testDataStream,
          op_type: 'create', // Required for data streams
          document: {
            '@timestamp': '2024-09-01T12:00:00.000Z',
            'event.action': 'test_action_null_event_id',
            // Deliberately omit event.id to test null handling
            'user.entity.id': 'test-user-null-event-id',
            'host.target.entity.id': 'test-target-null-event-id',
          },
          refresh: 'wait_for',
        });

        const createdDocId = createResponse._id;
        const createdIndex = createResponse._index;

        try {
          // Verify the event was created without event.id
          const verifyResponse = await es.search({
            index: testDataStream,
            query: {
              bool: {
                filter: [
                  {
                    term: {
                      _id: createdDocId,
                    },
                  },
                ],
                must_not: [
                  {
                    exists: {
                      field: 'event.id',
                    },
                  },
                ],
              },
            },
          });

          expect(verifyResponse.hits.hits.length).to.be.greaterThan(
            0,
            'Test event with null event.id should exist'
          );

          // Query specifically for the event with null event.id using esQuery filter
          // Also provide originEventIds to trigger the COALESCE logic for isOrigin/isOriginAlert
          // This tests that events with null event.id get isOrigin=false (not null)
          const response = await postGraph(supertest, {
            query: {
              indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
              // Include originEventIds to test that isOrigin evaluates to false (not null)
              // when event.id is null - the COALESCE(..., false) is critical here
              originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: true }],
              start: '2024-09-01T00:00:00Z',
              end: '2024-09-02T00:00:00Z',
              esQuery: {
                bool: {
                  filter: [
                    {
                      match_phrase: {
                        'user.entity.id': 'test-user-null-event-id',
                      },
                    },
                  ],
                },
              },
            },
          }).expect(result(200));

          expect(response.body).to.have.property('nodes');
          expect(response.body).to.have.property('edges');

          // Should find the event with null event.id
          expect(response.body.nodes.length).to.be.greaterThan(
            0,
            'Should return nodes for event with null event.id'
          );

          const labelNodes = response.body.nodes.filter(
            (n: NodeDataModel) => n.shape === 'label'
          ) as LabelNodeDataModel[];

          // Verify we got at least one label node for the null event.id event
          expect(labelNodes.length).to.be.greaterThan(
            0,
            'Should have label node for event with null event.id'
          );

          // All label nodes should have valid IDs with the pattern oe([01])oa([01])
          // This confirms COALESCE ensures boolean isOrigin and isOriginAlert values
          // even when event.id is null (should be oe(0)oa(0) for non-origin events)
          labelNodes.forEach((labelNode: LabelNodeDataModel) => {
            expect(labelNode.id).to.match(
              /oe\([01]\)oa\([01]\)/,
              `Label node ID should contain oe(0|1)oa(0|1) pattern but got: ${labelNode.id}. ` +
                'If the pattern shows null instead of 0/1, the COALESCE fix is missing.'
            );
          });

          // The event with null event.id should have isOrigin=false (oe(0)) since
          // event.id IN (...) returns null when event.id is null, and COALESCE should
          // convert that to false
          const nullEventIdLabelNode = labelNodes.find((n: LabelNodeDataModel) =>
            n.label?.includes('test_action_null_event_id')
          );
          expect(nullEventIdLabelNode).to.not.be(undefined);
          expect(nullEventIdLabelNode!.id).to.match(
            /oe\(0\)oa\(0\)/,
            'Event with null event.id should have isOrigin=false (oe(0)) and isOriginAlert=false (oa(0))'
          );
        } finally {
          // Clean up: delete the test event using the actual backing index
          if (createdDocId && createdIndex) {
            await es
              .delete({
                index: createdIndex,
                id: createdDocId,
                refresh: 'wait_for',
              })
              .catch(() => {
                // Ignore errors if already deleted
              });
          }
        }
      });

      describe('Graph without data enrichment', () => {
        before(async () => {
          await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': true });
        });

        after(async () => {
          await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': false });
        });

        it('should return 200 when securitySolution:enableAssetInventory is true without enrich policy', async () => {
          const response = await postGraph(supertest, {
            query: {
              originEventIds: [],
              start: '2024-09-01T00:00:00Z',
              end: '2024-09-02T00:00:00Z',
              esQuery: {
                bool: {
                  filter: [
                    {
                      match_phrase: {
                        'user.entity.id': 'admin@example.com',
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
        });

        // v2 index without lookup mode - verify graph API still works (no enrichment)
        describe('v2 index without lookup mode (fallback to no enrichment)', () => {
          before(async () => {
            // Delete the v2 lookup index if it exists
            try {
              await es.indices.delete({
                index: getEntitiesLatestIndexName(),
                ignore_unavailable: true,
              });
            } catch (e) {
              // Ignore if index doesn't exist
            }

            // Create a new index with the same name but with standard mode (no lookup mode)
            // This simulates having an entity index that's not configured for LOOKUP JOIN
            await es.indices.create({
              index: getEntitiesLatestIndexName(),
              settings: {
                index: {
                  mode: 'standard', // Not 'lookup' mode
                },
              },
              mappings: {
                properties: {
                  'entity.id': { type: 'keyword' },
                  'entity.name': { type: 'keyword' },
                  'entity.type': { type: 'keyword' },
                  'entity.sub_type': { type: 'keyword' },
                },
              },
            });

            // Index some entity data directly (without lookup mode, enrichment won't work)
            await es.index({
              index: getEntitiesLatestIndexName(),
              id: 'admin@example.com',
              document: {
                'entity.id': 'admin@example.com',
                'entity.name': 'AdminExample',
                'entity.type': 'Identity',
                'entity.sub_type': 'GCP IAM User',
              },
              refresh: true,
            });
          });

          after(async () => {
            // Clean up the standard mode v2 index
            try {
              await es.indices.delete({
                index: getEntitiesLatestIndexName(),
                ignore_unavailable: true,
              });
            } catch (e) {
              // Ignore if index doesn't exist
            }
          });

          it('should still return graph data without entity enrichment when v2 index is not in lookup mode', async () => {
            // The graph API should work but without entity enrichment
            // since the v2 index exists but is not in lookup mode
            const response = await postGraph(supertest, {
              query: {
                originEventIds: [],
                start: '2024-09-01T00:00:00Z',
                end: '2024-09-02T00:00:00Z',
                esQuery: {
                  bool: {
                    filter: [
                      {
                        match_phrase: {
                          'user.entity.id': 'admin@example.com',
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

            // Find the actor node - it should NOT be enriched since v2 is not in lookup mode
            // and v1 enrich policy doesn't exist
            const actorNode = response.body.nodes.find(
              (node: EntityNodeDataModel) => node.id === 'admin@example.com'
            ) as EntityNodeDataModel;

            expect(actorNode).not.to.be(undefined);
            // Without enrichment, the label should be the entity ID (not the enriched name)
            expect(actorNode.label).to.equal('admin@example.com');
            // Without enrichment, should have default icon/shape for unknown entity
            expect(actorNode.icon).to.equal('magnifyWithExclamation');
            // Entity should indicate it's NOT available in entity store
            expect(actorNode.documentsData).to.have.length(1);
            expectExpect(actorNode.documentsData).toContainEqual(
              expectExpect.objectContaining({
                id: 'admin@example.com',
                type: 'entity',
                entity: expectExpect.objectContaining({
                  availableInEntityStore: false,
                  ecsParentField: 'user',
                }),
              })
            );

            const targetNode = response.body.nodes.find(
              (node: EntityNodeDataModel) => node.id === 'projects/your-project-id/roles/customRole'
            ) as EntityNodeDataModel;
            expect(targetNode).not.to.be(undefined);
            expect(targetNode.label).to.equal('projects/your-project-id/roles/customRole');
            expect(targetNode.icon).to.equal('magnifyWithExclamation');
            expect(targetNode.documentsData).to.have.length(1);
            expectExpect(targetNode.documentsData).toContainEqual(
              expectExpect.objectContaining({
                id: 'projects/your-project-id/roles/customRole',
                type: 'entity',
                entity: expectExpect.objectContaining({
                  ecsParentField: 'entity',
                  availableInEntityStore: false,
                }),
              })
            );
          });
        });
      });

      describe('Enrich graph with entity metadata', () => {
        // Entity store is initialized once at the parent level to avoid race conditions
        // Tests run sequentially: first v1 (ENRICH), then v2 (LOOKUP JOIN)
        // All enrichment tests run in a dedicated space called 'entities-space'
        const enrichPolicyCreationTimeout = 15000;
        const entitiesSpaceId = 'entities-space';
        let entitiesSpaceDataView: ReturnType<typeof dataViewRouteHelpersFactory>;

        // Shared test suite that registers all test cases - called from both v1 and v2 describe blocks
        // All tests run in the dedicated entities-space
        const runEnrichmentTests = () => {
          it('should contain entity data when asset inventory is enabled', async () => {
            await retry.tryForTime(enrichPolicyCreationTimeout, async () => {
              const response = await postGraph(
                supertest,
                {
                  query: {
                    originEventIds: [],
                    start: '2024-09-01T00:00:00Z',
                    end: '2024-09-02T00:00:00Z',
                    esQuery: {
                      bool: {
                        filter: [
                          {
                            match_phrase: {
                              'user.entity.id': 'admin@example.com',
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
                },
                undefined,
                entitiesSpaceId
              ).expect(result(200));

              expect(response.body).to.have.property('nodes').length(3);
              expect(response.body).to.have.property('edges').length(2);
              expect(response.body).not.to.have.property('messages');
              // Find the actor node directly by entity ID (single entity uses entity ID as node ID)
              const actorNode = response.body.nodes.find(
                (node: EntityNodeDataModel) => node.id === 'admin@example.com'
              ) as EntityNodeDataModel;

              // Verify entity enrichment
              expect(actorNode).not.to.be(undefined);
              // For single enriched entities, label should be entity.name
              expect(actorNode.label).to.equal('AdminExample');
              expect(actorNode.icon).to.equal('user');
              expect(actorNode.shape).to.equal('ellipse');
              expect(actorNode.tag).to.equal('Identity');

              // Verify other nodes
              response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
                expect(node).to.have.property('color');

                if (node.shape === 'label') {
                  expect(node.color).equal(
                    'primary',
                    `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
                  );
                  expect(node.documentsData).to.have.length(2);
                  expectExpect(node.documentsData).toContainEqual(
                    expectExpect.objectContaining({
                      type: 'event',
                    })
                  );
                  expectExpect(node.documentsData).toContainEqual(
                    expectExpect.objectContaining({
                      type: 'alert',
                    })
                  );
                } else {
                  expect(node.color).equal(
                    'primary',
                    `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
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
          });

          it('should return enriched data when asset inventory is enabled - multi target', async () => {
            await retry.tryForTime(enrichPolicyCreationTimeout, async () => {
              const response = await postGraph(
                supertest,
                {
                  query: {
                    indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
                    originEventIds: [{ id: 'service-host-event-id', isAlert: false }],
                    start: '2024-09-01T00:00:00Z',
                    end: '2024-09-02T00:00:00Z',
                  },
                },
                undefined,
                entitiesSpaceId
              ).expect(result(200, logger));

              // Should have 3 nodes: 1 actor (single service), 1 grouped target (2 hosts), 1 label
              expect(response.body).to.have.property('nodes').length(3);
              expect(response.body).to.have.property('edges').length(2);

              const actorNode = response.body.nodes.find(
                (node: NodeDataModel) =>
                  node.id === 'service-account-123@project.iam.gserviceaccount.com'
              ) as EntityNodeDataModel;

              // Verify entity enrichment for service actor (single entity)
              expect(actorNode).not.to.be(undefined);
              expect(actorNode.label).to.equal('ServiceAccount123');
              expect(actorNode.icon).to.equal('cloudStormy');
              expect(actorNode.shape).to.equal('rectangle');
              expect(actorNode.tag).to.equal('Service');
              expect(actorNode.count).to.be(undefined); // No count for single entity
              expect(actorNode.documentsData).to.have.length(1);
              expectExpect(actorNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'service-account-123@project.iam.gserviceaccount.com',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'ServiceAccount123',
                    type: 'Service',
                    sub_type: 'GCP Service Account',
                    ecsParentField: 'service',
                    availableInEntityStore: true,
                  }),
                })
              );

              // Find grouped target node by checking for count property
              const targetNode = response.body.nodes.find(
                (node: EntityNodeDataModel) => node.id === '599353ee39e688c8a37d9d2818d77898'
              ) as EntityNodeDataModel;

              // Verify entity enrichment for grouped targets (2 hosts of same type/subtype)
              expect(targetNode).not.to.be(undefined);
              expect(targetNode.label).to.equal('GCP Compute Instance'); // Should show sub_type for grouped entities
              expect(targetNode.icon).to.equal('container'); // Default icon for unmapped entity type
              expect(targetNode.shape).to.equal('rectangle'); // Default shape for grouped entities
              expect(targetNode.tag).to.equal('Container');
              expect(targetNode.count).to.equal(2);
              expect(targetNode.documentsData).to.have.length(2);
              expectExpect(targetNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'host-instance-1',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'HostInstance1',
                    type: 'Container',
                    sub_type: 'GCP Compute Instance',
                    ecsParentField: 'host',
                    availableInEntityStore: true,
                  }),
                })
              );
              expectExpect(targetNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'host-instance-2',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'HostInstance2',
                    type: 'Container',
                    sub_type: 'GCP Compute Instance',
                    ecsParentField: 'host',
                    availableInEntityStore: true,
                  }),
                })
              );
            });
          });

          it('should enrich graph with entity metadata for actor acting on single target', async () => {
            await retry.tryForTime(enrichPolicyCreationTimeout, async () => {
              const response = await postGraph(
                supertest,
                {
                  query: {
                    indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
                    originEventIds: [{ id: 'entity-enrichment-event-id', isAlert: true }],
                    start: '2024-09-10T14:00:00Z',
                    end: '2024-09-10T15:00:00Z',
                  },
                },
                undefined,
                entitiesSpaceId
              ).expect(result(200));

              expect(response.body).to.have.property('nodes').length(3);
              expect(response.body).to.have.property('edges').length(2);
              expect(response.body).not.to.have.property('messages');

              const actorNode = response.body.nodes.find(
                (node: NodeDataModel) => node.id === 'entity-user@example.com'
              ) as EntityNodeDataModel;
              expect(actorNode).not.to.be(undefined);
              expect(actorNode.label).to.equal('EntityTestUser');
              expect(actorNode.icon).to.equal('user');
              expect(actorNode.shape).to.equal('ellipse');
              expect(actorNode.tag).to.equal('Identity');
              // ecsParentField assertion
              expect(actorNode!.documentsData!.length).to.equal(1);
              expectExpect(actorNode!.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'entity-user@example.com',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'EntityTestUser',
                    type: 'Identity',
                    sub_type: 'GCP IAM User',
                    ecsParentField: 'user',
                    availableInEntityStore: true,
                  }),
                })
              );

              const serviceTargetNode = response.body.nodes.find(
                (node: NodeDataModel) => node.id === 'entity-service-target-1'
              ) as EntityNodeDataModel;
              expect(serviceTargetNode).not.to.be(undefined);
              expect(serviceTargetNode.label).to.equal('ComputeServiceTarget');
              expect(serviceTargetNode.shape).to.equal('rectangle');
              expect(serviceTargetNode.tag).to.equal('Compute');
              expect(serviceTargetNode!.documentsData!.length).to.be.greaterThan(0);

              expectExpect(serviceTargetNode!.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'entity-service-target-1',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'ComputeServiceTarget',
                    type: 'Compute',
                    sub_type: 'GCP Compute Instance',
                    ecsParentField: 'service',
                    availableInEntityStore: true,
                  }),
                })
              );

              const labelNode = response.body.nodes.find(
                (node: NodeDataModel) => node.shape === 'label'
              ) as LabelNodeDataModel;
              expect(labelNode).not.to.be(undefined);
              expect(labelNode.color).equal('primary');
              expect(labelNode.documentsData).to.have.length(2);
              expectExpect(labelNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  type: 'event',
                })
              );
              expectExpect(labelNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  type: 'alert',
                })
              );

              response.body.edges.forEach((edge: EdgeDataModel) => {
                expect(edge).to.have.property('color');
                expect(edge.color).equal(
                  'subdued',
                  `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
                );
                expect(edge.type).equal('solid');
              });
            });
          });

          it('should enrich graph with multiple targets from different fields with mixed grouping', async () => {
            await retry.tryForTime(enrichPolicyCreationTimeout, async () => {
              const response = await postGraph(
                supertest,
                {
                  query: {
                    indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
                    originEventIds: [{ id: 'multi-target-mixed-event-id', isAlert: false }],
                    start: '2024-09-11T09:00:00Z',
                    end: '2024-09-11T11:00:00Z',
                  },
                },
                undefined,
                entitiesSpaceId
              ).expect(result(200));

              // Expected structure:
              // - 1 actor node (single user)
              // - 1 grouped target node for Storage entities (target-bucket-a, target-bucket-b from entity.target.id + target-bucket-c from service.target.entity.id)
              // - 1 single target node for Service entity (target-sa-different from service.target.entity.id)
              // - 2 label nodes (one for each target type due to different entity types)
              // Total: 5 nodes, 4 edges (actor->label1->service, actor->label2->storage group)
              expect(response.body).to.have.property('nodes').length(5);
              expect(response.body).to.have.property('edges').length(4);
              expect(response.body).not.to.have.property('messages');

              // Verify actor node (single enriched user)
              const actorNode = response.body.nodes.find(
                (node: NodeDataModel) => node.id === 'multi-target-user@example.com'
              ) as EntityNodeDataModel;
              expect(actorNode).not.to.be(undefined);
              expect(actorNode.label).to.equal('MultiTargetUser');
              expect(actorNode.icon).to.equal('user');
              expect(actorNode.shape).to.equal('ellipse');
              expect(actorNode.tag).to.equal('Identity');
              expect(actorNode.count).to.be(undefined); // Single entity, no count
              expect(actorNode.documentsData).to.have.length(1);
              expectExpect(actorNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'multi-target-user@example.com',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'MultiTargetUser',
                    type: 'Identity',
                    sub_type: 'GCP IAM User',
                    ecsParentField: 'user',
                    availableInEntityStore: true,
                  }),
                })
              );

              // Find grouped Storage target node (should have 3 buckets: target-bucket-a, target-bucket-b, target-bucket-c)
              const storageGroupNode = response.body.nodes.find(
                (node: EntityNodeDataModel) => node.id === '60829c004e98c57e5a2095bb4d6608bb'
              ) as EntityNodeDataModel;
              expect(storageGroupNode).not.to.be(undefined);
              expect(storageGroupNode.label).to.equal('GCP Storage Bucket'); // Shows sub_type for grouped entities
              expect(storageGroupNode.shape).to.equal('rectangle');
              expect(storageGroupNode.tag).to.equal('Storage');
              expect(storageGroupNode.count).to.equal(3);
              expect(storageGroupNode.documentsData).to.have.length(3);
              expectExpect(storageGroupNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'projects/multi-target-project-id/buckets/target-bucket-a',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'TargetBucketA',
                    type: 'Storage',
                    sub_type: 'GCP Storage Bucket',
                    ecsParentField: 'entity',
                    availableInEntityStore: true,
                  }),
                })
              );
              expectExpect(storageGroupNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'projects/multi-target-project-id/buckets/target-bucket-b',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'TargetBucketB',
                    type: 'Storage',
                    sub_type: 'GCP Storage Bucket',
                    ecsParentField: 'entity',
                    availableInEntityStore: true,
                  }),
                })
              );
              expectExpect(storageGroupNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'projects/multi-target-project-id/buckets/target-bucket-c',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'TargetBucketC',
                    type: 'Storage',
                    sub_type: 'GCP Storage Bucket',
                    ecsParentField: 'service',
                    availableInEntityStore: true,
                  }),
                })
              );

              // Find single Service target node (target-sa-different)
              const serviceNode = response.body.nodes.find(
                (node: EntityNodeDataModel) =>
                  node.id ===
                  'projects/multi-target-project-id/serviceAccounts/target-sa-different@multi-target-project-id.iam.gserviceaccount.com'
              ) as EntityNodeDataModel;
              expect(serviceNode).not.to.be(undefined);
              expect(serviceNode.label).to.equal('TargetServiceDifferent');
              expect(serviceNode.icon).to.equal('cloudStormy'); // Service type icon
              expect(serviceNode.shape).to.equal('rectangle');
              expect(serviceNode.tag).to.equal('Service');
              expect(serviceNode.count).to.be(undefined); // Single entity, no count
              expect(serviceNode.documentsData).to.have.length(1);
              expectExpect(serviceNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'projects/multi-target-project-id/serviceAccounts/target-sa-different@multi-target-project-id.iam.gserviceaccount.com',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'TargetServiceDifferent',
                    type: 'Service',
                    sub_type: 'GCP Service Account',
                    ecsParentField: 'service',
                    availableInEntityStore: true,
                  }),
                })
              );

              // Verify label nodes (should have 2 - one for each target type)
              const labelNodes = response.body.nodes.filter(
                (node: NodeDataModel) => node.shape === 'label'
              ) as LabelNodeDataModel[];
              expect(labelNodes).to.have.length(2);
              labelNodes.forEach((labelNode) => {
                expect(labelNode.color).equal('primary');
                expect(labelNode.label).to.equal('google.cloud.multi.target.action');
                expect(labelNode.documentsData).to.have.length(1);
                expectExpect(labelNode.documentsData).toContainEqual(
                  expectExpect.objectContaining({
                    type: 'event',
                  })
                );
              });

              // Verify edges
              response.body.edges.forEach((edge: EdgeDataModel) => {
                expect(edge).to.have.property('color');
                expect(edge.color).equal(
                  'subdued',
                  `edge color mismatched [edge: ${edge.id}] [actual: ${edge.color}]`
                );
                expect(edge.type).equal('solid');
              });
            });
          });

          it('should handle entities with partial data (name only or type/subtype only)', async () => {
            await retry.tryForTime(enrichPolicyCreationTimeout, async () => {
              const response = await postGraph(
                supertest,
                {
                  query: {
                    indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
                    originEventIds: [{ id: 'partial-entity-event-id', isAlert: false }],
                    start: '2024-09-12T09:00:00Z',
                    end: '2024-09-12T11:00:00Z',
                  },
                },
                undefined,
                entitiesSpaceId
              ).expect(result(200));

              expect(response.body).to.have.property('nodes').length(3);
              expect(response.body).to.have.property('edges').length(2);
              expect(response.body).not.to.have.property('messages');

              // Verify actor node - entity with only name (no type/sub_type)
              const actorNode = response.body.nodes.find(
                (node: NodeDataModel) => node.id === 'partial-user@example.com'
              ) as EntityNodeDataModel;
              expect(actorNode).not.to.be(undefined);
              // Label should be the entity name since it exists
              expect(actorNode.label).to.equal('partial-user@example.com');
              // Icon and shape should be defaults since type is missing
              expect(actorNode.icon).to.equal('magnifyWithExclamation');
              expect(actorNode.shape).to.equal('rectangle');
              expect(actorNode.documentsData).to.have.length(1);
              expectExpect(actorNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'partial-user@example.com',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    name: 'PartialUserNameOnly',
                    ecsParentField: 'user',
                    availableInEntityStore: true,
                  }),
                })
              );
              // Verify type and sub_type are NOT present in the entity data
              expectExpect(actorNode.documentsData![0].entity).not.toHaveProperty('type');
              expectExpect(actorNode.documentsData![0].entity).not.toHaveProperty('sub_type');

              // Verify target node - entity with only type/sub_type (no name)
              const targetNode = response.body.nodes.find(
                (node: NodeDataModel) => node.id === 'partial-host-instance-1'
              ) as EntityNodeDataModel;
              expect(targetNode).not.to.be(undefined);
              // Icon and shape should be based on type since it exists
              expect(targetNode.icon).to.equal('container');
              expect(targetNode.shape).to.equal('rectangle');
              expect(targetNode.tag).to.equal('Container');
              expect(targetNode.documentsData).to.have.length(1);
              expectExpect(targetNode.documentsData).toContainEqual(
                expectExpect.objectContaining({
                  id: 'partial-host-instance-1',
                  type: 'entity',
                  entity: expectExpect.objectContaining({
                    type: 'Container',
                    sub_type: 'GCP Compute Instance',
                    ecsParentField: 'host',
                    availableInEntityStore: true,
                  }),
                })
              );
              // Verify name is NOT present in the entity data
              expectExpect(targetNode.documentsData![0].entity).not.toHaveProperty('name');

              // Verify label node
              const labelNode = response.body.nodes.find(
                (node: NodeDataModel) => node.shape === 'label'
              ) as LabelNodeDataModel;
              expect(labelNode).not.to.be(undefined);
              expect(labelNode.label).to.equal('google.compute.v1.Instances.start');
              expect(labelNode.color).to.equal('primary');
            });
          });
        };

        before(async () => {
          // delete v2 index manually since its not being deleted by the cleanupEntityStore function
          try {
            await es.indices.delete({
              index: getEntitiesLatestIndexName(entitiesSpaceId),
              ignore_unavailable: true,
            });
          } catch (e) {
            // Ignore if index doesn't exist
          }

          // Delete and recreate the entities-space
          await spacesService.delete(entitiesSpaceId);
          await spacesService.create({
            id: entitiesSpaceId,
            name: 'Entities Space',
            solution: 'security',
            disabledFeatures: [],
          });

          // Enable asset inventory setting in entities-space
          await kibanaServer.uiSettings.update(
            { 'securitySolution:enableAssetInventory': true },
            { space: entitiesSpaceId }
          );

          // Initialize security-solution data-view in entities-space
          entitiesSpaceDataView = dataViewRouteHelpersFactory(supertest, entitiesSpaceId);
          await entitiesSpaceDataView.create('security-solution');

          // Initialize entity engine for 'generic' type in entities-space
          await initEntityEnginesWithRetry({
            supertest,
            retry,
            logger,
            entityTypes: ['generic'],
            spaceId: entitiesSpaceId,
          });

          await installCloudAssetInventoryPackage({ supertest, logger, spaceId: entitiesSpaceId });
        });

        after(async () => {
          // Disable asset inventory setting in entities-space
          await kibanaServer.uiSettings.update(
            { 'securitySolution:enableAssetInventory': false },
            { space: entitiesSpaceId }
          );

          await entitiesSpaceDataView.delete('security-solution');
          await spacesService.delete(entitiesSpaceId);
        });

        describe('via ENRICH policy (v1)', () => {
          before(async () => {
            await esArchiver.load(
              'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/entity_store'
            );

            // Wait for entity data to be fully indexed
            await waitForEntityDataIndexed({
              es,
              logger,
              retry,
              entitiesIndex: `.entities.v1.latest.security_generic_${entitiesSpaceId}`,
              expectedCount: 13,
            });

            // Wait for enrich policy to be created and execute it
            await waitForEnrichPolicyCreated({ es, retry, logger, spaceId: entitiesSpaceId });
            await executeEnrichPolicy({ es, retry, logger, spaceId: entitiesSpaceId });
          });

          runEnrichmentTests();
        });

        describe('via LOOKUP JOIN (v2)', () => {
          before(async () => {
            await esArchiver.load(
              'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/entity_store_v2'
            );

            // Wait for entity data to be fully indexed
            await waitForEntityDataIndexed({
              es,
              logger,
              retry,
              entitiesIndex: getEntitiesLatestIndexName(entitiesSpaceId),
              expectedCount: 13,
            });
          });

          after(async () => {
            await esArchiver.unload(
              'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/entity_store_v2'
            );
          });

          runEnrichmentTests();
        });
      });

      describe('Without new ECS field mappings in alerts', () => {
        before(async () => {
          // security_alerts - contains ONLY legacy fields (actor.entity.id, target.entity.id)
          // Since we only query for new ECS fields, alerts without them won't be found
          await esArchiver.load(
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/security_alerts'
          );
          await esArchiver.load(
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit'
          );
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
        });

        it('should not return alerts that only have legacy fields (no new ECS fields)', async () => {
          const response = await postGraph(supertest, {
            query: {
              originEventIds: [{ id: 'kabcd1234efgh5678', isAlert: false }],
              start: '2024-09-01T12:30:00.000Z||-30m',
              end: '2024-09-01T12:30:00.000Z||+30m',
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
              expectExpect(node.documentsData).not.toContainEqual(
                expectExpect.objectContaining({
                  type: 'alert',
                  alert: { ruleName: 'GCP IAM Custom Role Creation' },
                })
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
      });
    });
  });
}

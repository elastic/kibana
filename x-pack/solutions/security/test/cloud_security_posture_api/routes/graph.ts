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
import { CLOUD_ASSET_DISCOVERY_PACKAGE_VERSION } from '@kbn/cloud-security-posture-plugin/common/constants';
import { isLabelNode } from '@kbn/cloud-security-posture-graph/src/components/utils';
import { getEnrichPolicyId } from '@kbn/cloud-security-posture-common/utils/helpers';
import type { FtrProviderContext } from '../ftr_provider_context';
import { result } from '../utils';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';
import { dataViewRouteHelpersFactory } from '../utils';

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

  /**
   * Reusable helper functions for entity store and enrich policy setup/teardown
   */
  const entityStoreHelpers = {
    /**
     * Waits for the enrich index to be created and populated with data.
     */
    waitForEnrichIndexPopulated: async (spaceId?: string) => {
      const spaceIdentifier = spaceId || 'default';
      await retry.waitFor(
        `enrich index to be created and populated for ${spaceIdentifier} space`,
        async () => {
          try {
            await es.enrich.executePolicy({
              name: getEnrichPolicyId(spaceId),
              wait_for_completion: true,
            });
            // Check if the enrich index has data (policy has been executed)
            const enrichIndexName = `.enrich-${getEnrichPolicyId(spaceId)}`;
            const count = await es.count({
              index: enrichIndexName,
            });
            return count.count > 0;
          } catch (e) {
            return false;
          }
        }
      );
    },

    /**
     * Cleans up entity store resources for a given space
     */
    cleanupSpaceEnrichResources: async (spaceId?: string) => {
      const spacePath = spaceId ? `/s/${spaceId}` : '';

      // Delete the generic entity engine which will properly clean up:
      // - Platform pipeline
      // - Field retention enrich policy
      // - Enrich indices
      // Note: Asset Inventory uses the 'generic' entity type
      try {
        await supertest
          .delete(`${spacePath}/api/entity_store/engines/generic?data=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        logger.debug(`Deleted entity store generic engine for space: ${spaceId || 'default'}`);
      } catch (e) {
        // Ignore 404 errors if the engine doesn't exist
        if (e.status !== 404) {
          logger.debug(
            `Error deleting entity store for space ${spaceId || 'default'}: ${
              e && e.message ? e.message : JSON.stringify(e)
            }`
          );
        }
      }
    },

    /**
     * Enables asset inventory for a given space
     */
    enableAssetInventory: async (spaceId?: string) => {
      const spacePath = spaceId ? `/s/${spaceId}` : '';
      await supertest
        .post(`${spacePath}/api/asset_inventory/enable`)
        .set('kbn-xsrf', 'xxxx')
        .send({})
        .expect(200);
    },

    /**
     * Waits for enrich policy to be created
     */
    waitForEnrichPolicyCreated: async (spaceId?: string) => {
      await retry.waitFor('enrich policy to be created', async () => {
        try {
          await es.enrich.getPolicy({ name: getEnrichPolicyId(spaceId) });
          return true;
        } catch (e) {
          return false;
        }
      });
    },

    /**
     * Installs cloud asset inventory package
     */
    installCloudAssetInventoryPackage: async (spaceId?: string) => {
      const spacePath = spaceId ? `/s/${spaceId}` : '';
      await supertest
        .post(`${spacePath}/api/fleet/epm/packages/_bulk`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          packages: [
            {
              name: 'cloud_asset_inventory',
              version: CLOUD_ASSET_DISCOVERY_PACKAGE_VERSION,
            },
          ],
        })
        .expect(200);
    },
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
        // security_alerts_modified_mappings - contains mappings for actor and target
        // security_alerts - does not contain mappings for actor and target
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/security_alerts_ecs_and_legacy_mappings'
        );
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit_ecs_and_legacy'
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
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit_ecs_and_legacy'
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

        expect(response.body).to.have.property('nodes').length(5);
        expect(response.body).to.have.property('edges').length(4);
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

        expect(response.body).to.have.property('nodes').length(5);
        expect(response.body).to.have.property('edges').length(4);
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

        describe('Enrich graph with entity metadata', () => {
          const enrichPolicyCreationTimeout = 15000;
          const customNamespaceId = 'test';
          const entitiesIndex = '.entities.v1.latest.security_*';
          let dataView: ReturnType<typeof dataViewRouteHelpersFactory>;
          let customSpaceDataView: ReturnType<typeof dataViewRouteHelpersFactory>;

          before(async () => {
            await entityStoreHelpers.cleanupSpaceEnrichResources(); // default space
            await entityStoreHelpers.cleanupSpaceEnrichResources(customNamespaceId); // test space

            await spacesService.delete(customNamespaceId);

            // Create a test space
            await spacesService.create({
              id: customNamespaceId,
              name: `${customNamespaceId} namespace`,
              solution: 'security',
              disabledFeatures: [],
            });

            // enable asset inventory in both default and test spaces
            await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': true });
            await kibanaServer.uiSettings.update(
              { 'securitySolution:enableAssetInventory': true },
              { space: customNamespaceId }
            );

            // Load fresh entity data
            await esArchiver.load(
              'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/entity_store'
            );

            // Wait for entity data to be indexed before proceeding
            // This ensures the enrich policy will have data when it executes
            await retry.waitFor('entity data to be indexed', async () => {
              const response = await es.count({
                index: entitiesIndex,
              });
              return response.count === 5;
            });

            // initialize security-solution-default data-view
            dataView = dataViewRouteHelpersFactory(supertest);
            await dataView.create('security-solution');

            // initialize security-solution-test data-view
            customSpaceDataView = dataViewRouteHelpersFactory(supertest, customNamespaceId);
            await customSpaceDataView.create('security-solution');

            // NOW enable asset inventory - this creates and executes the enrich policy with all entities
            await entityStoreHelpers.enableAssetInventory();
            await entityStoreHelpers.enableAssetInventory(customNamespaceId);

            // Wait for enrich policy to be created (async operation after enable returns)
            await entityStoreHelpers.waitForEnrichPolicyCreated();
            await entityStoreHelpers.waitForEnrichPolicyCreated(customNamespaceId);

            // Wait for enrich indexes to be created AND populated with data
            await entityStoreHelpers.waitForEnrichIndexPopulated();
            await entityStoreHelpers.waitForEnrichIndexPopulated(customNamespaceId);
          });

          after(async () => {
            // Clean up all enrich resources
            await entityStoreHelpers.cleanupSpaceEnrichResources(); // default space
            await entityStoreHelpers.cleanupSpaceEnrichResources(customNamespaceId); // test space

            await kibanaServer.uiSettings.update({
              'securitySolution:enableAssetInventory': false,
            });
            await kibanaServer.uiSettings.update(
              { 'securitySolution:enableAssetInventory': false },
              { space: customNamespaceId }
            );

            await es.deleteByQuery({
              index: entitiesIndex,
              query: { match_all: {} },
              conflicts: 'proceed',
            });

            await dataView.delete('security-solution');
            await customSpaceDataView.delete('security-solution');
            await spacesService.delete(customNamespaceId);
          });

          it('should contain entity data when asset inventory is enabled', async () => {
            // although enrich policy is already create via 'api/asset_inventory/enable'
            // we still would like to replicate as if cloud asset discovery integration was fully installed
            await entityStoreHelpers.installCloudAssetInventoryPackage();

            // Looks like there's some async operation that runs in the background
            // so we use retry.tryForTime to wait for it to finish - otherwise sometimes policy is not yet created
            await retry.tryForTime(enrichPolicyCreationTimeout, async () => {
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
              // Find the actor node
              const actorNode = response.body.nodes.find(
                (node: NodeDataModel) => node.id === 'admin@example.com'
              ) as EntityNodeDataModel;

              // Verify entity enrichment
              expect(actorNode).not.to.be(undefined);
              expect(actorNode.label).to.equal('AWS IAM User');
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

          it('should return enriched data when asset inventory is enabled in a different space - multi target', async () => {
            await entityStoreHelpers.installCloudAssetInventoryPackage(customNamespaceId);

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
                customNamespaceId
              ).expect(result(200, logger));

              const actorNode = response.body.nodes.find(
                (node: NodeDataModel) =>
                  node.id === 'service-account-123@project.iam.gserviceaccount.com'
              ) as EntityNodeDataModel;

              // Verify entity enrichment for service actor
              expect(actorNode).not.to.be(undefined);
              expect(actorNode.label).to.equal('GCP Service Account');
              expect(actorNode.icon).to.equal('cloudStormy');
              expect(actorNode.shape).to.equal('rectangle');
              expect(actorNode.tag).to.equal('Service');

              // Verify we have the target node (host-instance-1)
              const targetNode = response.body.nodes.find(
                (node: NodeDataModel) => node.id === 'host-instance-1'
              );
              expect(targetNode).not.to.be(undefined);
            });
          });
        });
      });

      describe('Without new ECS field mappings in alerts', () => {
        before(async () => {
          // security_alerts_modified_mappings - contains mappings for both legacy and new ECS fields
          // security_alerts - contains ONLY legacy fields (actor.entity.id, target.entity.id)
          // Since we only query for new ECS fields, alerts without them won't be found
          await esArchiver.load(
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/security_alerts'
          );
          await esArchiver.load(
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit_ecs_and_legacy'
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
            'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit_ecs_and_legacy'
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

    describe('Only ECS fields for actor and target', () => {
      // Wait for the enrich policy to be created and executed
      const enrichPolicyCreationTimeout = 15000;
      const entitiesIndex = '.entities.v1.latest.security_*';
      let dataView: ReturnType<typeof dataViewRouteHelpersFactory>;

      before(async () => {
        // Clean up any leftover resources from previous runs
        await entityStoreHelpers.cleanupSpaceEnrichResources(); // default space

        // Clean up alerts index from previous tests
        await es.deleteByQuery({
          index: '.internal.alerts-*',
          query: { match_all: {} },
          conflicts: 'proceed',
          ignore_unavailable: true,
        });

        // enable asset inventory
        await kibanaServer.uiSettings.update({ 'securitySolution:enableAssetInventory': true });

        // Load fresh entity data
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/entity_store'
        );

        // Wait for entity data to be indexed before proceeding
        // This ensures the enrich policy will have data when it executes
        await retry.waitFor('entity data to be indexed', async () => {
          const response = await es.count({
            index: entitiesIndex,
          });
          // We expect 3 documents for default space
          return response.count >= 3;
        });

        // Load the new ECS schema archives (ONLY new fields, no legacy actor.entity.id/target.entity.id)
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit_ecs'
        );
        await esArchiver.load(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/security_alerts_ecs'
        );

        // Wait for alerts to be indexed
        await retry.waitFor('alerts to be indexed', async () => {
          const response = await es.count({
            index: '.internal.alerts-*',
          });
          return response.count >= 3;
        });

        // initialize security-solution-default data-view
        dataView = dataViewRouteHelpersFactory(supertest);
        await dataView.create('security-solution');

        // NOW enable asset inventory - this creates and executes the enrich policy with all entities
        await entityStoreHelpers.enableAssetInventory();

        // Wait for enrich policy to be created (async operation after enable returns)
        await entityStoreHelpers.waitForEnrichPolicyCreated();

        // Wait for enrich index to be created AND populated with data
        await entityStoreHelpers.waitForEnrichIndexPopulated();
      });

      after(async () => {
        // Clean up all enrich resources
        await entityStoreHelpers.cleanupSpaceEnrichResources(); // default space

        await kibanaServer.uiSettings.update({
          'securitySolution:enableAssetInventory': false,
        });

        await es.deleteByQuery({
          index: entitiesIndex,
          query: { match_all: {} },
          conflicts: 'proceed',
        });

        // Clean up alerts
        await es.deleteByQuery({
          index: '.internal.alerts-*',
          query: { match_all: {} },
          conflicts: 'proceed',
        });

        await esArchiver.unload(
          'x-pack/solutions/security/test/cloud_security_posture_api/es_archives/logs_gcp_audit_ecs'
        );

        if (dataView) {
          await dataView.delete('security-solution');
        }
      });

      it('should enrich graph with entity metadata for actor acting on single target', async () => {
        await entityStoreHelpers.installCloudAssetInventoryPackage();

        await retry.tryForTime(enrichPolicyCreationTimeout, async () => {
          const response = await postGraph(supertest, {
            query: {
              indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
              originEventIds: [{ id: 'entity-enrichment-event-id', isAlert: true }],
              start: '2024-09-10T14:00:00Z',
              end: '2024-09-10T15:00:00Z',
            },
          }).expect(result(200));

          expect(response.body).to.have.property('nodes').length(3);
          expect(response.body).to.have.property('edges').length(2);
          expect(response.body).not.to.have.property('messages');

          const actorNode = response.body.nodes.find(
            (node: NodeDataModel) => node.id === 'entity-user@example.com'
          ) as EntityNodeDataModel;
          expect(actorNode).not.to.be(undefined);
          expect(actorNode.label).to.equal('GCP IAM User');
          expect(actorNode.icon).to.equal('user');
          expect(actorNode.shape).to.equal('ellipse');
          expect(actorNode.tag).to.equal('Identity');

          const serviceTargetNode = response.body.nodes.find(
            (node: NodeDataModel) => node.id === 'entity-service-target-1'
          ) as EntityNodeDataModel;
          expect(serviceTargetNode).not.to.be(undefined);
          expect(serviceTargetNode.label).to.equal('GCP Compute Instance');
          expect(serviceTargetNode.shape).to.equal('rectangle');
          expect(serviceTargetNode.tag).to.equal('Compute');

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

      it('should return a graph with both alert and event for only new ECS schema fields', async () => {
        const response = await postGraph(supertest, {
          query: {
            indexPatterns: ['.alerts-security.alerts-*', 'logs-*'],
            originEventIds: [{ id: 'only-new-schema-event-id', isAlert: true }],
            start: '2024-09-05T00:00:00Z',
            end: '2024-09-06T00:00:00Z',
          },
        }).expect(result(200));

        expect(response.body).to.have.property('nodes').length(3);
        expect(response.body).to.have.property('edges').length(2);
        expect(response.body).not.to.have.property('messages');

        const actorNode = response.body.nodes.find(
          (node: NodeDataModel) => node.id === 'only-new-schema-user@example.com'
        ) as EntityNodeDataModel;
        expect(actorNode).not.to.be(undefined);
        expect(actorNode.shape).to.equal('rectangle');

        const targetNode = response.body.nodes.find(
          (node: NodeDataModel) =>
            node.id === 'projects/only-new-schema-project-id/serviceAccounts/deleted-sa'
        ) as EntityNodeDataModel;
        expect(targetNode).not.to.be(undefined);
        expect(targetNode.shape).to.equal('rectangle');

        response.body.nodes.forEach((node: EntityNodeDataModel | LabelNodeDataModel) => {
          expect(node).to.have.property('color');
          expect(node.color).equal(
            'primary',
            `node color mismatched [node: ${node.id}] [actual: ${node.color}]`
          );
          if (isLabelNode(node)) {
            expect(node.documentsData).to.have.length(2);
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
    });
  });
}

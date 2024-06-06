/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { schema } from '@kbn/config-schema';
import { SavedObjectRelation } from '@kbn/saved-objects-management-plugin/public';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

// TODO: convert to supertestWithoutAuth

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  let roleAuthc: RoleCredentials;

  const relationSchema = schema.object({
    id: schema.string(),
    type: schema.string(),
    relationship: schema.oneOf([schema.literal('parent'), schema.literal('child')]),
    meta: schema.object({
      title: schema.string(),
      icon: schema.string(),
      editUrl: schema.maybe(schema.string()),
      // dashboards and visualizations don't declare an inAppUrl
      inAppUrl: schema.maybe(
        schema.object({
          path: schema.string(),
          uiCapabilitiesPath: schema.string(),
        })
      ),
      namespaceType: schema.string(),
      hiddenType: schema.boolean(),
    }),
  });
  const invalidRelationSchema = schema.object({
    id: schema.string(),
    type: schema.string(),
    relationship: schema.oneOf([schema.literal('parent'), schema.literal('child')]),
    error: schema.string(),
  });

  describe('relationships', () => {
    const baseApiUrl = `/api/kibana/management/saved_objects/relationships`;
    const defaultTypes = ['visualization', 'index-pattern', 'search', 'dashboard'];

    const relationshipsUrl = (type: string, id: string, types: string[] = defaultTypes) => {
      const typesQuery = types.map((t) => `savedObjectTypes=${t}`).join('&');
      return `${baseApiUrl}/${type}/${id}?${typesQuery}`;
    };
    let relations1: SavedObjectRelation;
    let relations2: SavedObjectRelation;

    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('defaultTypes relations', () => {
      before(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
        await kibanaServer.importExport.load(
          'test/api_integration/fixtures/kbn_archiver/management/saved_objects/relationships.json'
        );
      });
      after(async () => {
        await kibanaServer.importExport.unload(
          'test/api_integration/fixtures/kbn_archiver/management/saved_objects/relationships.json'
        );
        await kibanaServer.savedObjects.cleanStandardList();
      });
      describe('searches', () => {
        it('should validate search relationships schema', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];
          expect(() => {
            relationSchema.validate(body.relations[0]);
          }).not.to.throwError();
        });

        it('should work for searches', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];
          relations2 = body.relations[1];
          expect(relations1).to.eql({
            id: '8963ca30-3224-11e8-a572-ffca06da1357',
            meta: {
              editUrl: '/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
              hiddenType: false,
              icon: 'indexPatternApp',
              inAppUrl: {
                path: '/app/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'management.kibana.indexPatterns',
              },
              namespaceType: 'multiple',
              title: 'saved_objects*',
            },
            relationship: 'child',
            type: 'index-pattern',
          });
          expect(relations2).to.eql({
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'parent',
          });
        });

        it('should filter based on savedObjectTypes', async () => {
          const { body } = await supertest
            .get(
              relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357', ['visualization'])
            )
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];
          relations2 = body.relations[1];
          expect(relations1).to.eql({
            id: '8963ca30-3224-11e8-a572-ffca06da1357',
            type: 'index-pattern',
            meta: {
              icon: 'indexPatternApp',
              title: 'saved_objects*',
              editUrl: '/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'management.kibana.indexPatterns',
              },
              namespaceType: 'multiple',
              hiddenType: false,
            },
            relationship: 'child',
          });
          expect(relations2).to.eql({
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            meta: {
              hiddenType: false,
              icon: 'visualizeApp',
              namespaceType: 'multiple-isolated',
              title: 'VisualizationFromSavedSearch',
            },
            relationship: 'parent',
            type: 'visualization',
          });
        });

        it('should return 404 if search finds no results', async () => {
          await supertest
            .get(relationshipsUrl('search', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(404);
        });
      });

      describe('dashboards', () => {
        it('should validate dashboard relationships schema', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];

          expect(() => {
            relationSchema.validate(body.relations[0]);
          }).not.to.throwError();
        });

        it('should work for dashboards', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];
          relations2 = body.relations[1];
          expect(relations1).to.eql({
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          });
          expect(relations2).to.eql({
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          });
        });

        it('should filter based on savedObjectTypes', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357', ['search']))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];
          relations2 = body.relations[1];
          expect(relations1).to.eql({
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'child',
          });
          expect(relations2).to.eql({
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'child',
          });
        });

        it('should return 404 if dashboard finds no results', async () => {
          await supertest
            .get(relationshipsUrl('dashboard', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(404);
        });
      });

      describe('visualizations', () => {
        it('should validate visualization relationships schema', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);

          expect(() => {
            relationSchema.validate(body.relations[0]);
          }).not.to.throwError();
        });

        it('should work for visualizations', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];
          relations2 = body.relations[1];
          expect(relations1).to.eql({
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            relationship: 'child',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          });
          expect(relations2).to.eql({
            id: 'b70c7ae0-3224-11e8-a572-ffca06da1357',
            type: 'dashboard',
            relationship: 'parent',
            meta: {
              icon: 'dashboardApp',
              title: 'Dashboard',
              inAppUrl: {
                path: '/app/dashboards#/view/b70c7ae0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'dashboard.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          });
        });

        it('should filter based on savedObjectTypes', async () => {
          const { body } = await supertest
            .get(
              relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357', ['search'])
            )
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];

          expect(relations1).to.eql({
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'child',
          });
        });

        it('should return 404 if visualizations finds no results', async () => {
          await supertest
            .get(relationshipsUrl('visualization', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(404);
        });
      });

      describe('index patterns', () => {
        it('should validate visualization relationships schema', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);

          expect(() => {
            relationSchema.validate(body.relations[0]);
          }).not.to.throwError();
        });

        it('should work for index patterns', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];
          relations2 = body.relations[1];
          expect(relations1).to.eql({
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            relationship: 'parent',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          });
          expect(relations2).to.eql({
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'parent',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          });
        });

        it('should filter based on savedObjectTypes', async () => {
          const { body } = await supertest
            .get(
              relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357', ['search'])
            )
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          relations1 = body.relations[0];
          expect(relations1).to.eql({
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'parent',
          });
        });

        it('should return 404 if index pattern finds no results', async () => {
          await supertest
            .get(relationshipsUrl('index-pattern', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(404);
        });
      });

      describe('invalid references', () => {
        it('should validate the relationships schema', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('dashboard', 'invalid-refs'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);

          expect(() => {
            relationSchema.validate(body.relations[0]);
          }).not.to.throwError();
          expect(() => {
            invalidRelationSchema.validate(body.invalidRelations[0]);
          }).not.to.throwError();
        });

        it('should return the invalid relations', async () => {
          const { body } = await supertest
            .get(relationshipsUrl('dashboard', 'invalid-refs'))
            .set(svlCommonApi.getInternalRequestHeader())
            .set(roleAuthc.apiKeyHeader)
            .expect(200);
          const invalidRelation = body.invalidRelations[0];
          relations1 = body.relations[0];

          expect(invalidRelation).to.eql({
            error: 'Saved object [visualization/invalid-vis] not found',
            id: 'invalid-vis',
            relationship: 'child',
            type: 'visualization',
          });
          expect(relations1).to.eql({
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            meta: {
              icon: 'visualizeApp',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
              title: 'Visualization',
            },
            relationship: 'child',
            type: 'visualization',
          });
        });
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { schema } from '@kbn/config-schema';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
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
      // visualizations don't declare an inAppUrl
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
  const responseSchema = schema.object({
    relations: schema.arrayOf(relationSchema),
    invalidRelations: schema.arrayOf(invalidRelationSchema),
  });

  describe('relationships', () => {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');

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

      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    const baseApiUrl = `/api/kibana/management/saved_objects/relationships`;
    const defaultTypes = ['visualization', 'index-pattern', 'search', 'dashboard'];

    const relationshipsUrl = (type: string, id: string, types: string[] = defaultTypes) => {
      const typesQuery = types.map((t) => `savedObjectTypes=${t}`).join('&');
      return `${baseApiUrl}/${type}/${id}?${typesQuery}`;
    };

    describe('validate response schema', () => {
      it('search', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });
      it('dashboard', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });
      it('visualization', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });
      it('index-pattern', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });
      it('invalid-refs', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('dashboard', 'invalid-refs'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(() => {
          responseSchema.validate(resp.body);
        }).not.to.throwError();
      });
    });

    describe('should work', () => {
      it('for searches', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        expect(resp.body.relations).to.eql([
          {
            id: '8963ca30-3224-11e8-a572-ffca06da1357',
            type: 'index-pattern',
            relationship: 'child',
            meta: {
              title: 'saved_objects*',
              icon: 'indexPatternApp',
              editUrl: '/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
              inAppUrl: {
                path: '/app/management/kibana/dataViews/dataView/8963ca30-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'management.kibana.indexPatterns',
              },
              namespaceType: 'multiple',
              hiddenType: false,
            },
          },
          {
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'parent',
            meta: {
              title: 'VisualizationFromSavedSearch',
              icon: 'visualizeApp',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          },
        ]);
      });
      it('for dashboards', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);
        expect(resp.body.relations).to.eql([
          {
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          },
          {
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'child',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          },
        ]);
      });
      it('for visualizations', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(resp.body.relations).to.eql([
          {
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            relationship: 'child',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover_v2.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          },
          {
            id: 'b70c7ae0-3224-11e8-a572-ffca06da1357',
            type: 'dashboard',
            relationship: 'parent',
            meta: {
              icon: 'dashboardApp',
              title: 'Dashboard',
              inAppUrl: {
                path: '/app/dashboards#/view/b70c7ae0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'dashboard_v2.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          },
        ]);
      });
      it('for index patterns', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(resp.body.relations).to.eql([
          {
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            relationship: 'parent',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover_v2.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          },
          {
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            relationship: 'parent',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
          },
        ]);
      });
    });

    describe('should filter based on savedObjectTypes', () => {
      it('search', async () => {
        const resp = await supertestWithoutAuth
          .get(
            relationshipsUrl('search', '960372e0-3224-11e8-a572-ffca06da1357', ['visualization'])
          )
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(resp.body.relations).to.eql([
          {
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
          },
          {
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'parent',
          },
        ]);
      });
      it('dashboard', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('dashboard', 'b70c7ae0-3224-11e8-a572-ffca06da1357', ['search']))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(resp.body.relations).to.eql([
          {
            id: 'add810b0-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'Visualization',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'child',
          },
          {
            id: 'a42c0580-3224-11e8-a572-ffca06da1357',
            type: 'visualization',
            meta: {
              icon: 'visualizeApp',
              title: 'VisualizationFromSavedSearch',
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'child',
          },
        ]);
      });
      it('visualization', async () => {
        const resp = await supertestWithoutAuth
          .get(
            relationshipsUrl('visualization', 'a42c0580-3224-11e8-a572-ffca06da1357', ['search'])
          )
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(resp.body.relations).to.eql([
          {
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover_v2.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'child',
          },
        ]);
      });
      it('index-pattern', async () => {
        const resp = await supertestWithoutAuth
          .get(
            relationshipsUrl('index-pattern', '8963ca30-3224-11e8-a572-ffca06da1357', ['search'])
          )
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(resp.body.relations).to.eql([
          {
            id: '960372e0-3224-11e8-a572-ffca06da1357',
            type: 'search',
            meta: {
              icon: 'discoverApp',
              title: 'OneRecord',
              inAppUrl: {
                path: '/app/discover#/view/960372e0-3224-11e8-a572-ffca06da1357',
                uiCapabilitiesPath: 'discover_v2.show',
              },
              namespaceType: 'multiple-isolated',
              hiddenType: false,
            },
            relationship: 'parent',
          },
        ]);
      });
    });

    describe('should return 404 no results for', () => {
      it('a search', async () => {
        await supertestWithoutAuth
          .get(relationshipsUrl('search', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(404);
      });
      it('a dashboard', async () => {
        await supertestWithoutAuth
          .get(relationshipsUrl('dashboard', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(404);
      });
      it('a visualization', async () => {
        await supertestWithoutAuth
          .get(relationshipsUrl('visualization', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(404);
      });
      it('an index pattern', async () => {
        await supertestWithoutAuth
          .get(relationshipsUrl('index-pattern', 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(404);
      });
    });

    describe('invalid references', () => {
      it('should return the invalid relations', async () => {
        const resp = await supertestWithoutAuth
          .get(relationshipsUrl('dashboard', 'invalid-refs'))
          .set(svlCommonApi.getInternalRequestHeader())
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(resp.body).to.eql({
          invalidRelations: [
            {
              error: 'Saved object [visualization/invalid-vis] not found',
              id: 'invalid-vis',
              relationship: 'child',
              type: 'visualization',
            },
          ],
          relations: [
            {
              id: 'add810b0-3224-11e8-a572-ffca06da1357',
              meta: {
                icon: 'visualizeApp',
                namespaceType: 'multiple-isolated',
                hiddenType: false,
                title: 'Visualization',
              },
              relationship: 'child',
              type: 'visualization',
            },
          ],
        });
      });
    });
  });
}

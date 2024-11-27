/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { SupertestWithRoleScopeType } from '../../../services';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const config = getService('config');
  const isServerless = config.get('serverless');
  const correctPrivileges = {
    applications: [],
    cluster: ['monitor', 'read_pipeline', ...(!isServerless ? ['read_ilm'] : [])],
    indices: [
      {
        allow_restricted_indices: false,
        names: ['synthetics-*'],
        privileges: ['view_index_metadata', 'create_doc', 'auto_configure', 'read'],
      },
    ],
    metadata: {},
    run_as: [],
    transient_metadata: {
      enabled: true,
    },
  };

  describe('SyntheticsEnablement', () => {
    const roleScopedSupertest = getService('roleScopedSupertest');
    const kibanaServer = getService('kibanaServer');

    let supertestWithEditorScope: SupertestWithRoleScopeType;
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const getApiKeys = async () => {
      const { body } = await supertestWithAdminScope
        .post('/internal/security/api_key/_query')
        .send({
          query: {
            bool: {
              filter: [
                {
                  term: {
                    name: 'synthetics-api-key (required for Synthetics App)',
                  },
                },
              ],
            },
          },
          sort: { field: 'creation', direction: 'desc' },
          from: 0,
          size: 25,
          filters: {},
        })
        .expect(200);

      const apiKeys = body.apiKeys || [];
      return apiKeys.filter(
        (apiKey: any) => apiKey.name.includes('synthetics-api-key') && apiKey.invalidated === false
      );
    };

    before(async () => {
      supertestWithEditorScope = await roleScopedSupertest.getSupertestWithRoleScope('editor', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        useCookieHeader: true,
      });
    });

    describe('[PUT] /internal/uptime/service/enablement', () => {
      before(async () => {
        supertestWithEditorScope = await roleScopedSupertest.getSupertestWithRoleScope('editor', {
          withInternalHeaders: true,
          useCookieHeader: true,
        });
        supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
          withInternalHeaders: true,
          useCookieHeader: true,
        });
      });

      beforeEach(async () => {
        const apiKeys = await getApiKeys();
        if (apiKeys.length) {
          await supertestWithAdminScope
            .delete(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
            .expect(200);
        }
      });

      after(async () => {
        // always invalidate API key for the scoped role in the end
        await supertestWithAdminScope.destroy();
        await supertestWithEditorScope.destroy();
      });

      it(`returns response when user cannot manage api keys`, async () => {
        const apiResponse = await supertestWithEditorScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: false,
          canEnable: false,
          isEnabled: false,
          isValidApiKey: false,
          isServiceAllowed: true,
        });
      });

      it(`returns response for an admin with privilege`, async () => {
        const apiResponse = await supertestWithAdminScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });
        const validApiKeys = await getApiKeys();
        expect(validApiKeys.length).eql(1);
        expect(validApiKeys[0].role_descriptors.synthetics_writer).eql(correctPrivileges);
      });

      it(`does not create excess api keys`, async () => {
        const apiResponse = await supertestWithAdminScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });

        const validApiKeys = await getApiKeys();
        expect(validApiKeys.length).eql(1);
        expect(validApiKeys[0].role_descriptors.synthetics_writer).eql(correctPrivileges);

        // call api a second time
        const apiResponse2 = await supertestWithAdminScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse2.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });

        const validApiKeys2 = await getApiKeys();
        expect(validApiKeys2.length).eql(1);
        expect(validApiKeys2[0].role_descriptors.synthetics_writer).eql(correctPrivileges);
      });

      it(`auto re-enables api key when invalidated`, async () => {
        const apiResponse = await supertestWithAdminScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });

        const validApiKeys = await getApiKeys();
        expect(validApiKeys.length).eql(1);
        expect(validApiKeys[0].role_descriptors.synthetics_writer).eql(correctPrivileges);

        // delete api key
        await supertestWithAdminScope
          .post('/internal/security/api_key/invalidate')
          .send({
            apiKeys: validApiKeys.map((apiKey: { id: string; name: string }) => ({
              id: apiKey.id,
              name: apiKey.name,
            })),
            isAdmin: true,
          })
          .expect(200);

        const validApiKeysAferDeletion = await getApiKeys();
        expect(validApiKeysAferDeletion.length).eql(0);

        // call api a second time
        const apiResponse2 = await supertestWithAdminScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse2.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });

        const validApiKeys2 = await getApiKeys();
        expect(validApiKeys2.length).eql(1);
        expect(validApiKeys2[0].role_descriptors.synthetics_writer).eql(correctPrivileges);
      });

      it('returns response for an uptime all user without admin privileges', async () => {
        const apiResponse = await supertestWithEditorScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: false,
          canEnable: false,
          isEnabled: false,
          isValidApiKey: false,
          isServiceAllowed: true,
        });
      });
    });

    describe('[DELETE] /internal/uptime/service/enablement', () => {
      beforeEach(async () => {
        const apiKeys = await getApiKeys();
        if (apiKeys.length) {
          await supertestWithAdminScope
            .delete(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
            .expect(200);
        }
      });

      it('with an admin', async () => {
        await supertestWithAdminScope.put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT).expect(200);
        const delResponse = await supertestWithAdminScope
          .delete(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);
        expect(delResponse.body).eql({});
        const apiResponse = await supertestWithAdminScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });
      });

      it('with an uptime user', async () => {
        await supertestWithAdminScope.put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT).expect(200);
        await supertestWithEditorScope
          .delete(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(403);
        const apiResponse = await supertestWithEditorScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);
        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: false,
          canEnable: false,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });
      });

      it('is space agnostic', async () => {
        const SPACE_ID = `test-space-${uuidv4()}`;
        const SPACE_NAME = `test-space-name-${uuidv4()}`;
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

        // can enable synthetics in default space when enabled in a non default space
        const apiResponseGet = await supertestWithAdminScope
          .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT}`)
          .expect(200);

        expect(apiResponseGet.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });

        await supertestWithAdminScope
          .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT}`)
          .expect(200);
        await supertestWithAdminScope.delete(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT).expect(200);
        const apiResponse = await supertestWithAdminScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });

        // can disable synthetics in non default space when enabled in default space
        await supertestWithAdminScope.put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT).expect(200);
        await supertestWithAdminScope
          .delete(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT}`)
          .expect(200);
        const apiResponse2 = await supertestWithAdminScope
          .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
          .expect(200);

        expect(apiResponse2.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: true,
          canEnable: true,
          isEnabled: true,
          isValidApiKey: true,
          isServiceAllowed: true,
        });
      });
    });
  });
}

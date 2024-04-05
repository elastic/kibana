/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

interface CommonRequestHeader {
  'kbn-xsrf': string;
}
type InternalRequestHeader = CommonRequestHeader & { 'x-elastic-internal-origin': string };
type RoleName = 'system_indices_superuser' | 'admin' | 'editor' | 'viewer';

const ALL_ENABLED = {
  areApiKeysEnabled: true,
  canManageApiKeys: true,
  canEnable: true,
  isEnabled: true,
  isValidApiKey: true,
};

export default function ({ getService }: FtrProviderContext) {
  const correctPrivileges = {
    applications: [],
    cluster: ['monitor', 'read_pipeline'],
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
    // failsOnMKI, see URL
    this.tags(['failsOnMKI']);
    const svlUserManager = getService('svlUserManager');
    const svlCommonApi = getService('svlCommonApi');
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    const esSupertest = getService('esSupertest');

    const getApiKeys = async () => {
      const { body } = await esSupertest.get(`/_security/api_key`).query({ with_limited_by: true });
      const apiKeys = body.api_keys || [];
      const filtered = apiKeys.filter(
        (apiKey: any) => apiKey.name.includes('synthetics-api-key') && apiKey.invalidated === false
      );
      return filtered;
    };
    let internalRequestHeader: InternalRequestHeader;

    before(async () => {
      internalRequestHeader = svlCommonApi.getInternalRequestHeader();
    });

    async function enablementPut(role: RoleName = 'admin', expectedStatus: number = 200) {
      return supertestWithoutAuth
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(internalRequestHeader)
        .set(await svlUserManager.getApiCredentialsForRole(role))
        .expect(expectedStatus);
    }

    async function enablementDelete(role: RoleName = 'admin', expectedStatus: number = 200) {
      return supertestWithoutAuth
        .delete(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(internalRequestHeader)
        .set(await svlUserManager.getApiCredentialsForRole(role))
        .expect(expectedStatus);
    }

    describe('[PUT] /internal/uptime/service/enablement', () => {
      const roles: RoleName[] = ['admin', 'editor', 'system_indices_superuser', 'viewer'];

      roles.forEach((role) => {
        it(`${role} role has appropriate permissions for API keys`, async () => {
          if ((await getApiKeys()).length) {
            await enablementDelete();
          }

          const { body } = await enablementPut(role);

          if (['system_indices_superuser', 'admin'].indexOf(role) !== -1) {
            expect(body).to.eql(ALL_ENABLED);
          } else {
            expect(body).to.eql({
              areApiKeysEnabled: true,
              canEnable: false,
              canManageApiKeys: false,
              isValidApiKey: false,
              // api key is not there, as it's deleted at the start of the tests
              isEnabled: false,
            });
          }
        });
      });

      it(`returns response for an admin with privilege`, async () => {
        if ((await getApiKeys()).length) {
          await enablementDelete();
        }
        const { body } = await enablementPut();
        expect(body).eql(ALL_ENABLED);
        const validApiKeys = await getApiKeys();
        expect(validApiKeys.length).eql(1);
        expect(validApiKeys[0].role_descriptors.synthetics_writer).eql(correctPrivileges);
      });

      it(`does not create excess api keys`, async () => {
        const apiKeysResult = await getApiKeys();
        expect(apiKeysResult.length).to.be.lessThan(2);
        if (apiKeysResult.length === 0) {
          await enablementPut();
        }
        const apiResponse = await enablementPut();
        expect(apiResponse.body).eql(ALL_ENABLED);

        const validApiKeys = await getApiKeys();
        expect(validApiKeys.length).eql(1);
        expect(validApiKeys[0].role_descriptors.synthetics_writer).eql(correctPrivileges);
      });

      it(`auto re-enables api key when invalidated`, async () => {
        const apiResponse = await enablementPut();

        expect(apiResponse.body).eql(ALL_ENABLED);

        const validApiKeys = await getApiKeys();
        expect(validApiKeys.length).eql(1);
        expect(validApiKeys[0].role_descriptors.synthetics_writer).eql(correctPrivileges);

        // delete api key
        await esSupertest
          .delete(`/_security/api_key`)
          .send({
            ids: [validApiKeys[0].id],
          })
          .expect(200);

        const validApiKeysAferDeletion = await getApiKeys();
        expect(validApiKeysAferDeletion.length).eql(0);

        // call api a second time
        const apiResponse2 = await enablementPut();

        expect(apiResponse2.body).eql(ALL_ENABLED);

        const validApiKeys2 = await getApiKeys();
        expect(validApiKeys2.length).eql(1);
        expect(validApiKeys2[0].role_descriptors.synthetics_writer).eql(correctPrivileges);
      });
    });

    describe('[DELETE] /internal/uptime/service/enablement', () => {
      beforeEach(async () => {
        const apiKeys = await getApiKeys();
        if (apiKeys.length) {
          await enablementDelete('system_indices_superuser');
        }
      });
      it('admin can delete api key', async () => {
        await enablementPut('system_indices_superuser');

        const delResponse = await enablementDelete('system_indices_superuser');

        expect(delResponse.body).eql({});
        const apiResponse = await enablementPut();

        expect(apiResponse.body).eql(ALL_ENABLED);
      });

      it('with an editor user', async () => {
        await enablementPut();
        await enablementDelete('editor', 403);
        const apiResponse = await enablementPut('editor');
        expect(apiResponse.body).eql({
          areApiKeysEnabled: true,
          canManageApiKeys: false,
          canEnable: false,
          isEnabled: true,
          isValidApiKey: true,
        });
      });
    });
  });
}

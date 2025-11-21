/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { pick } from 'lodash';
import type { KibanaRoleDescriptors, RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';

function assertHas(actual: unknown, expected: object) {
  expect(pick(actual, Object.keys(expected))).eql(expected);
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('AddEditParams', function () {
    const samlAuth = getService('samlAuth');
    const supertest = getService('supertestWithoutAuth');
    const syntheticsAllRole: KibanaRoleDescriptors = {
      elasticsearch: {
        indices: [
          {
            names: ['synthetics-*'],
            privileges: ['all'],
          },
        ],
      },
      kibana: [
        {
          base: [],
          spaces: ['*'],
          feature: {
            uptime: ['all'],
          },
        },
      ],
    };
    let syntheticsAllAuthc: RoleCredentials;
    let adminRoleAuthc: RoleCredentials;
    let editorRoleAuthc: RoleCredentials;
    const kServer = getService('kibanaServer');
    const testParam = {
      key: 'test',
      value: 'test',
    };
    const testPrivateLocations = new PrivateLocationTestService(getService);

    before(async () => {
      await testPrivateLocations.installSyntheticsPackage();

      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      editorRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('editor');

      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    beforeEach(async () => {
      await samlAuth.setCustomRole(syntheticsAllRole);
      syntheticsAllAuthc = await samlAuth.createM2mApiKeyWithCustomRoleScope();
    });

    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsAllAuthc);
      await samlAuth.deleteCustomRole();
    });

    it('adds a test param', async () => {
      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponse.body[0].key).eql(testParam.key);
      expect(getResponse.body[0].value).eql(undefined);
    });

    it('handles tags and description', async () => {
      const tagsAndDescription = {
        tags: ['a tag'],
        description: 'test description',
      };
      const testParam2 = {
        ...testParam,
        ...tagsAndDescription,
      };
      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .send(testParam2)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      assertHas(getResponse.body[0], { key: testParam2.key, ...tagsAndDescription });
      expect(getResponse.body[0].value).eql(undefined);
    });

    it('handles editing a param', async () => {
      const expectedUpdatedParam = {
        key: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const param = getResponse.body[0];
      expect(param.key).eql(testParam.key);
      expect(param.value).eql(undefined);

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + param.id)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({})
        .expect(400);

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + param.id)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ...expectedUpdatedParam, value: 'testUpdated' })
        .expect(200);

      const updatedGetResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const actualUpdatedParam = updatedGetResponse.body[0];
      assertHas(actualUpdatedParam, expectedUpdatedParam);
      expect(actualUpdatedParam.value).eql(undefined);
    });

    it('handles partial editing a param', async () => {
      const newParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      const response = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(newParam)
        .expect(200);
      const paramId = response.body.id;

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS + '/' + paramId)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      assertHas(getResponse.body, {
        key: newParam.key,
        tags: newParam.tags,
        description: newParam.description,
      });
      expect(getResponse.body.value).eql(undefined);

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + paramId)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          key: 'testUpdated',
        })
        .expect(200);

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + paramId)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          key: 'testUpdatedAgain',
          value: 'testUpdatedAgain',
        })
        .expect(200);

      const updatedGetResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS + '/' + paramId)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      assertHas(updatedGetResponse.body, {
        key: 'testUpdatedAgain',
        tags: newParam.tags,
        description: newParam.description,
      });
      expect(updatedGetResponse.body.value).eql(undefined);
    });

    it('handles spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponse.body[0].namespaces).eql([SPACE_ID]);
      expect(getResponse.body[0].key).eql(testParam.key);
      expect(getResponse.body[0].value).eql(undefined);
    });

    it('handles editing a param in spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      const expectedUpdatedParam = {
        key: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const param = getResponse.body[0];
      expect(param.key).eql(testParam.key);
      expect(param.value).eql(undefined);

      await supertest
        .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}/${param.id}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ...expectedUpdatedParam, value: 'testUpdated' })
        .expect(200);

      const updatedGetResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const actualUpdatedParam = updatedGetResponse.body[0];
      assertHas(actualUpdatedParam, expectedUpdatedParam);
      expect(actualUpdatedParam.value).eql(undefined);
    });

    it('does not allow editing a param in created in one space in a different space', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const SPACE_ID_TWO = `test-space-${uuidv4()}-two`;
      const SPACE_NAME_TWO = `test-space-name ${uuidv4()} 2`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      await kServer.spaces.create({ id: SPACE_ID_TWO, name: SPACE_NAME_TWO });

      const updatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const param = getResponse.body[0];
      expect(param.key).eql(testParam.key);
      expect(param.value).eql(undefined);

      // space does exist so get request should be 200
      await supertest
        .get(`/s/${SPACE_ID_TWO}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      await supertest
        .put(`/s/${SPACE_ID_TWO}${SYNTHETICS_API_URLS.PARAMS}/${param.id}}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(updatedParam)
        .expect(404);

      const updatedGetResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const actualUpdatedParam = updatedGetResponse.body[0];
      expect(actualUpdatedParam.key).eql(testParam.key);
      expect(actualUpdatedParam.value).eql(undefined);
    });

    it('handles invalid spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await supertest
        .post(`/s/doesnotexist${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(404);
    });

    it('handles editing with invalid spaces', async () => {
      const updatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);
      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const param = getResponse.body[0];
      expect(param.key).eql(testParam.key);
      expect(param.value).eql(undefined);

      await supertest
        .put(`/s/doesnotexist${SYNTHETICS_API_URLS.PARAMS}/${param.id}}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(updatedParam)
        .expect(404);
    });

    it('handles share across spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ...testParam, share_across_spaces: true })
        .expect(200);

      const getResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponse.body[0].namespaces).eql(['*']);
      expect(getResponse.body[0].key).eql(testParam.key);
      expect(getResponse.body[0].value).eql(undefined);
    });

    it('should NOT return values for editor user', async () => {
      const editorTestParam = {
        key: 'editorTestParam',
        value: 'editorTestParamValue',
      };
      const postResp = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(editorTestParam)
        .expect(200);
      const getAllResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}`)
        .set(editorRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);
      const getResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${postResp.body.id}`)
        .set(editorRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      expect(getResp.body.value).to.eql(undefined);

      const params = getAllResp.body;
      params.forEach((param: any) => {
        expect(param.value).to.eql(undefined);
        expect(param.key).to.not.empty();
      });
    });

    it('should NOT return values for read-only synthetics custom role', async () => {
      const syntheticsReadOnlyTestParam = {
        key: 'syntheticsReadOnlyTestParam',
        value: 'syntheticsReadOnlyTestParamValue',
      };
      const syntheticsReadOnlyRole = {
        elasticsearch: {
          indices: [
            {
              names: ['synthetics-*'],
              privileges: ['read'],
            },
          ],
        },
        kibana: [
          {
            base: [],
            spaces: ['*'],
            feature: {
              uptime: ['read'],
            },
          },
        ],
      };

      await samlAuth.setCustomRole(syntheticsReadOnlyRole);
      const syntheticsReadOnlyRoleAuth = await samlAuth.createM2mApiKeyWithCustomRoleScope();

      // Create a param first as admin
      const postRes = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(syntheticsReadOnlyTestParam)
        .expect(200);

      // Read params as read-only user
      const getAllResp = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsReadOnlyRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const getResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${postRes.body.id}`)
        .set(syntheticsReadOnlyRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.eql(undefined);
        expect(param.key).to.not.empty();
      });
      expect(getResp.body.value).to.eql(undefined);
      expect(getResp.body.key).to.eql(syntheticsReadOnlyTestParam.key);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsReadOnlyRoleAuth);
      await samlAuth.deleteCustomRole();
    });

    it('SHOULD RETURN values for admin user', async () => {
      // skip in cloud until sub feature privileges are merged in serverless and statefull
      this.tags('skipCloud');
      const adminTestParam = {
        key: 'adminTestParam',
        value: 'adminTestParamValue',
      };
      const postResp = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(adminTestParam)
        .expect(200);
      const getAllResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);
      const getResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${postResp.body.id}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      expect(getResp.body.key).to.eql(adminTestParam.key);
      expect(getResp.body.value).to.eql(adminTestParam.value);

      const params = getAllResp.body;
      params.forEach((param: any) => {
        expect(param.value).to.not.empty();
        expect(param.key).to.not.empty();
      });
    });

    it('should NOT return values with custom role with ALL permissions', async () => {
      const syntheticsAllRoleParam = {
        key: 'syntheticsAllRoleParam',
        value: 'syntheticsAllRoleParamValue',
      };
      await samlAuth.setCustomRole(syntheticsAllRole);
      const syntheticsAllRoleAuth = await samlAuth.createM2mApiKeyWithCustomRoleScope();

      // Create a param first as admin
      const postRes = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(syntheticsAllRoleParam)
        .expect(200);

      // Read params as user with ALL permissions
      const getAllResp = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const getResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${postRes.body.id}`)
        .set(syntheticsAllRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.eql(undefined);
        expect(param.key).to.not.empty();
      });

      expect(getResp.body.key).eql(syntheticsAllRoleParam.key);
      expect(getResp.body.value).eql(undefined);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsAllRoleAuth);
      await samlAuth.deleteCustomRole();
    });

    it('SHOULD RETURN values for custom role with ALL and read params subfeature privilege', async () => {
      // skip in cloud until sub feature privileges are merged in serverless and statefull
      this.tags('skipCloud');
      const syntheticsReadParamsRole: KibanaRoleDescriptors = {
        elasticsearch: {
          indices: [
            {
              names: ['synthetics-*'],
              privileges: ['all'],
            },
          ],
        },
        kibana: [
          {
            base: [],
            spaces: ['*'],
            feature: {
              uptime: ['all', 'can_read_params'],
            },
          },
        ],
      };
      await samlAuth.setCustomRole(syntheticsReadParamsRole);
      const syntheticsReadParamsRoleAuth = await samlAuth.createM2mApiKeyWithCustomRoleScope();
      const syntheticsReadParamsTestParam = {
        key: 'syntheticsReadParamsTestParam',
        value: 'syntheticsReadParamsTestParamValue',
      };

      // Create a param first as user with read params privilege
      const postRes = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsReadParamsRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(syntheticsReadParamsTestParam)
        .expect(200);

      // Read params as user with read params privilege
      const getAllResp = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsReadParamsRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const getResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${postRes.body.id}`)
        .set(syntheticsReadParamsRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.not.empty();
        expect(param.key).to.not.empty();
      });

      expect(getResp.body.key).eql(syntheticsReadParamsTestParam.key);
      expect(getResp.body.value).eql(syntheticsReadParamsTestParam.value);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsReadParamsRoleAuth);
      await samlAuth.deleteCustomRole();
    });

    it('SHOULD RETURN values for custom role with MINIMAL_ALL and read params subfeature privilege', async () => {
      // skip in cloud until sub feature privileges are merged in serverless and statefull
      this.tags('skipCloud');
      const syntheticsReadParamsRole: KibanaRoleDescriptors = {
        elasticsearch: {
          indices: [
            {
              names: ['synthetics-*'],
              privileges: ['all'],
            },
          ],
        },
        kibana: [
          {
            base: [],
            spaces: ['*'],
            feature: {
              uptime: ['minimal_all', 'can_read_params'],
            },
          },
        ],
      };
      await samlAuth.setCustomRole(syntheticsReadParamsRole);
      const syntheticsReadParamsRoleAuth = await samlAuth.createM2mApiKeyWithCustomRoleScope();
      const syntheticsReadParamsTestParam = {
        key: 'syntheticsReadParamsTestParam',
        value: 'syntheticsReadParamsTestParamValue',
      };

      // Create a param first as user with read params privilege
      const postRes = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsReadParamsRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(syntheticsReadParamsTestParam)
        .expect(200);

      // Read params as user with read params privilege
      const getAllResp = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsReadParamsRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const getResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${postRes.body.id}`)
        .set(syntheticsReadParamsRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.not.empty();
        expect(param.key).to.not.empty();
      });

      expect(getResp.body.key).eql(syntheticsReadParamsTestParam.key);
      expect(getResp.body.value).eql(syntheticsReadParamsTestParam.value);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsReadParamsRoleAuth);
      await samlAuth.deleteCustomRole();
    });

    it('SHOULD RETURN values for custom role with READ and read params subfeature privilege', async () => {
      // skip in cloud until sub feature privileges are merged in serverless and statefull
      this.tags('skipCloud');
      const syntheticsReadParamsRole: KibanaRoleDescriptors = {
        elasticsearch: {
          indices: [
            {
              names: ['synthetics-*'],
              privileges: ['read'],
            },
          ],
        },
        kibana: [
          {
            base: [],
            spaces: ['*'],
            feature: {
              uptime: ['read', 'can_read_params'],
            },
          },
        ],
      };
      await samlAuth.setCustomRole(syntheticsReadParamsRole);
      const syntheticsReadParamsRoleAuth = await samlAuth.createM2mApiKeyWithCustomRoleScope();
      const syntheticsReadParamsTestParam = {
        key: 'syntheticsReadParamsTestParam',
        value: 'syntheticsReadParamsTestParamValue',
      };

      // Create a param first as admin
      const postRes = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(syntheticsReadParamsTestParam)
        .expect(200);

      // Read params as user with read params privilege
      const getAllResp = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsReadParamsRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const getResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${postRes.body.id}`)
        .set(syntheticsReadParamsRoleAuth.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.not.empty();
        expect(param.key).to.not.empty();
      });

      expect(getResp.body.key).eql(syntheticsReadParamsTestParam.key);
      expect(getResp.body.value).eql(syntheticsReadParamsTestParam.value);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(syntheticsReadParamsRoleAuth);
      await samlAuth.deleteCustomRole();
    });

    it('should handle bulk deleting params', async () => {
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });

      const params = [
        { key: 'param1', value: 'value1' },
        { key: 'param2', value: 'value2' },
        { key: 'param3', value: 'value3' },
      ];

      for (const param of params) {
        await supertest
          .post(SYNTHETICS_API_URLS.PARAMS)
          .set(syntheticsAllAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(param)
          .expect(200);
      }

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponse.body.length).to.eql(3);

      const ids = getResponse.body.map((param: any) => param.id);

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS + '/_bulk_delete')
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids })
        .expect(200);

      const getResponseAfterDelete = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponseAfterDelete.body.length).to.eql(0);
    });

    it('handles single parameter deletion', async () => {
      const postResp = await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'to-be-deleted', value: 'value' })
        .expect(200);

      const paramId = postResp.body.id;

      const getResp = await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${paramId}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      expect(getResp.body.key).to.eql('to-be-deleted');

      await supertest
        .delete(`${SYNTHETICS_API_URLS.PARAMS}/${paramId}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      await supertest
        .get(`${SYNTHETICS_API_URLS.PARAMS}/${paramId}`)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(404);
    });

    // it does not work like this today - need to check how duplicates are handled
    // Bug ticket https://github.com/elastic/kibana/issues/243894
    it.skip('returns a 409 conflict when creating a duplicate key', async () => {
      const param = { key: 'duplicate-key', value: 'value1' };
      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(param)
        .expect(200);

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ...param, value: 'value2' })
        .expect(409);

      const getAllResp = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(syntheticsAllAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const noDuplicates = getAllResp.body.filter((p: any) => p.key === param.key);
      expect(noDuplicates.length).to.eql(1);
    });

    it('returns 403 for a user with no synthetics privileges', async () => {
      const noSyntheticsRole = {
        kibana: [
          {
            base: [],
            spaces: ['*'],
            feature: {
              dashboard: ['read'],
            },
          },
        ],
        elasticsearch: {
          indices: [
            {
              names: ['log-*'],
              privileges: ['read'],
            },
          ],
        },
      };
      await samlAuth.setCustomRole(noSyntheticsRole);
      const noSyntheticsAuthc = await samlAuth.createM2mApiKeyWithCustomRoleScope();

      await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(noSyntheticsAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(403);

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(noSyntheticsAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'foo', value: 'bar' })
        .expect(403);

      await supertest
        .put(`${SYNTHETICS_API_URLS.PARAMS}/some-id`)
        .set(noSyntheticsAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'foo', value: 'bar' })
        .expect(403);

      await supertest
        .delete(`${SYNTHETICS_API_URLS.PARAMS}/some-id`)
        .set(noSyntheticsAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(403);

      await samlAuth.invalidateM2mApiKeyWithRoleScope(noSyntheticsAuthc);
      await samlAuth.deleteCustomRole();
    });
  });
}

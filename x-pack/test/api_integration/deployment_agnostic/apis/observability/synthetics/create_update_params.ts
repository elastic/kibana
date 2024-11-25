/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { pick } from 'lodash';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { SyntheticsMonitorTestService } from '../../../services/synthetics_monitor';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';

function assertHas(actual: unknown, expected: object) {
  expect(pick(actual, Object.keys(expected))).eql(expected);
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe.skip('AddEditParams', function () {
    this.tags('skipCloud');
    const samlAuth = getService('samlAuth');
    const supertest = getService('supertestWithoutAuth');
    let adminRoleAuthc: RoleCredentials;

    const kServer = getService('kibanaServer');
    const testParam = {
      key: 'test',
      value: 'test',
    };
    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    before(async () => {
      await testPrivateLocations.installSyntheticsPackage();
      adminRoleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    it('adds a test param', async () => {
      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      assertHas(getResponse.body[0], testParam);
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
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      assertHas(getResponse.body[0], testParam2);
    });

    it('handles editing a param', async () => {
      const expectedUpdatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const param = getResponse.body[0];
      assertHas(param, testParam);

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + param.id)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({})
        .expect(400);

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + param.id)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const updatedGetResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const actualUpdatedParam = updatedGetResponse.body[0];
      assertHas(actualUpdatedParam, expectedUpdatedParam);
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
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(newParam)
        .expect(200);
      const paramId = response.body.id;

      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS + '/' + paramId)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      assertHas(getResponse.body, newParam);

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + paramId)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          key: 'testUpdated',
        })
        .expect(200);

      await supertest
        .put(SYNTHETICS_API_URLS.PARAMS + '/' + paramId)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          key: 'testUpdatedAgain',
          value: 'testUpdatedAgain',
        })
        .expect(200);

      const updatedGetResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS + '/' + paramId)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      assertHas(updatedGetResponse.body, {
        ...newParam,
        key: 'testUpdatedAgain',
        value: 'testUpdatedAgain',
      });
    });

    it('handles spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponse.body[0].namespaces).eql([SPACE_ID]);
      assertHas(getResponse.body[0], testParam);
    });

    it('handles editing a param in spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      const expectedUpdatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const param = getResponse.body[0];
      assertHas(param, testParam);

      await supertest
        .put(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}/${param.id}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(expectedUpdatedParam)
        .expect(200);

      const updatedGetResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const actualUpdatedParam = updatedGetResponse.body[0];
      assertHas(actualUpdatedParam, expectedUpdatedParam);
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
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);

      const getResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const param = getResponse.body[0];
      assertHas(param, testParam);

      // space does exist so get request should be 200
      await supertest
        .get(`/s/${SPACE_ID_TWO}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      await supertest
        .put(`/s/${SPACE_ID_TWO}${SYNTHETICS_API_URLS.PARAMS}/${param.id}}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(updatedParam)
        .expect(404);

      const updatedGetResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const actualUpdatedParam = updatedGetResponse.body[0];
      assertHas(actualUpdatedParam, testParam);
    });

    it('handles invalid spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await supertest
        .post(`/s/doesnotexist${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
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
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(testParam)
        .expect(200);
      const getResponse = await supertest
        .get(SYNTHETICS_API_URLS.PARAMS)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const param = getResponse.body[0];
      assertHas(param, testParam);

      await supertest
        .put(`/s/doesnotexist${SYNTHETICS_API_URLS.PARAMS}/${param.id}}`)
        .set(adminRoleAuthc.apiKeyHeader)
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
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ...testParam, share_across_spaces: true })
        .expect(200);

      const getResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.PARAMS}`)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(getResponse.body[0].namespaces).eql(['*']);
      assertHas(getResponse.body[0], testParam);
    });

    it('should not return values for non admin user', async () => {
      const { username, password } = await monitorTestService.addsNewSpace();
      const resp = await supertestWithoutAuth
        .get(`${SYNTHETICS_API_URLS.PARAMS}`)
        .auth(username, password)
        .set(adminRoleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send()
        .expect(200);

      const params = resp.body;
      expect(params.length).to.eql(6);
      params.forEach((param: any) => {
        expect(param.value).to.eql(undefined);
        expect(param.key).to.not.empty();
      });
    });
  });
}

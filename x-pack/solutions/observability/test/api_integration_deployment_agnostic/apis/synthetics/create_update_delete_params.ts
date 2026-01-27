/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { pick } from 'lodash';
import type { KibanaRoleDescriptors } from '@kbn/ftr-common-functional-services';
import expect from '@kbn/expect';
import { syntheticsParamType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import type { SupertestWithRoleScopeType } from '../../services';

function assertHas(actual: unknown, expected: object) {
  expect(pick(actual, Object.keys(expected))).eql(expected);
}

const ROLE_CONFIGS: Record<string, KibanaRoleDescriptors> = {
  SYNTHETICS_ALL: {
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
  },
  SYNTHETICS_READ_ONLY: {
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
  },
  SYNTHETICS_ALL_WITH_READ_PARAMS: {
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
          uptime: ['all', 'can_read_param_values'],
        },
      },
    ],
  },
  SYNTHETICS_MINIMAL_ALL_WITH_READ_PARAMS: {
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
          uptime: ['minimal_all', 'can_read_param_values'],
        },
      },
    ],
  },
  SYNTHETICS_READ_WITH_READ_PARAMS: {
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
          uptime: ['read', 'can_read_param_values'],
        },
      },
    ],
  },
  NO_SYNTHETICS: {
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
  },
} as const;

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('AddEditParams', function () {
    const roleScopedSupertest = getService('roleScopedSupertest');
    const paramsApi = getService('syntheticsParamsApi');
    let supertestAdminWithApiKey: SupertestWithRoleScopeType;
    let supertestEditorWithApiKey: SupertestWithRoleScopeType;
    const kServer = getService('kibanaServer');
    const testParam = {
      key: 'test',
      value: 'test',
    };
    const testPrivateLocations = new PrivateLocationTestService(getService);

    before(async () => {
      await testPrivateLocations.installSyntheticsPackage();

      supertestAdminWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
      });
      supertestEditorWithApiKey = await roleScopedSupertest.getSupertestWithRoleScope('editor', {
        withInternalHeaders: true,
      });

      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    after(async () => {
      await supertestAdminWithApiKey.destroy();
      await supertestEditorWithApiKey.destroy();
      await paramsApi.cleanup();
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });
    });

    it('adds a test param', async () => {
      await paramsApi.createParam({ param: testParam, auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      const getResponse = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL });

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
      await paramsApi.createParam({ param: testParam2, auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      const getResponse = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      assertHas(getResponse.body[0], { key: testParam2.key, ...tagsAndDescription });
      expect(getResponse.body[0].value).eql(undefined);
    });

    it('handles editing a param', async () => {
      const expectedUpdatedParam = {
        key: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await paramsApi.createParam({ param: testParam, auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      const getResponse = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL });
      const param = getResponse.body[0];
      expect(param.key).eql(testParam.key);
      expect(param.value).eql(undefined);

      await paramsApi.updateParam({
        paramId: param.id,
        param: {},
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        expectedStatus: 400,
      });

      await paramsApi.updateParam({
        paramId: param.id,
        param: { ...expectedUpdatedParam, value: 'testUpdated' },
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });

      const updatedGetResponse = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL });
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

      const response = await paramsApi.createParam({
        param: newParam,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });
      const paramId = response.body.id;

      const getResponse = await paramsApi.getParam({
        paramId,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });
      assertHas(getResponse.body, {
        key: newParam.key,
        tags: newParam.tags,
        description: newParam.description,
      });
      expect(getResponse.body.value).eql(undefined);

      await paramsApi.updateParam({
        paramId,
        param: { key: 'testUpdated' },
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });

      await paramsApi.updateParam({
        paramId,
        param: {
          key: 'testUpdatedAgain',
          value: 'testUpdatedAgain',
        },
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });

      const updatedGetResponse = await paramsApi.getParam({
        paramId,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });
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

      await paramsApi.createParam({
        param: testParam,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });

      const getResponse = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });

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

      await paramsApi.createParam({
        param: testParam,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });

      const getResponse = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });
      const param = getResponse.body[0];
      expect(param.key).eql(testParam.key);
      expect(param.value).eql(undefined);

      await paramsApi.updateParam({
        paramId: param.id,
        param: { ...expectedUpdatedParam, value: 'testUpdated' },
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });

      const updatedGetResponse = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });
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

      await paramsApi.createParam({
        param: testParam,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });

      const getResponse = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });
      const param = getResponse.body[0];
      expect(param.key).eql(testParam.key);
      expect(param.value).eql(undefined);

      // space does exist so get request should be 200
      await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL, spaceId: SPACE_ID_TWO });

      await paramsApi.updateParam({
        paramId: param.id,
        param: updatedParam,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID_TWO,
        expectedStatus: 404,
      });

      const updatedGetResponse = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });
      const actualUpdatedParam = updatedGetResponse.body[0];
      expect(actualUpdatedParam.key).eql(testParam.key);
      expect(actualUpdatedParam.value).eql(undefined);
    });

    it('handles invalid spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await paramsApi.createParam({
        param: testParam,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: 'doesnotexist',
        expectedStatus: 404,
      });
    });

    it('handles editing with invalid spaces', async () => {
      const updatedParam = {
        key: 'testUpdated',
        value: 'testUpdated',
        tags: ['a tag'],
        description: 'test description',
      };

      await paramsApi.createParam({ param: testParam, auth: ROLE_CONFIGS.SYNTHETICS_ALL });
      const getResponse = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL });
      const param = getResponse.body[0];
      expect(param.key).eql(testParam.key);
      expect(param.value).eql(undefined);

      await paramsApi.updateParam({
        paramId: param.id,
        param: updatedParam,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: 'doesnotexist',
        expectedStatus: 404,
      });
    });

    it('handles share across spaces', async () => {
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;

      await kServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

      await paramsApi.createParam({
        param: { ...testParam, share_across_spaces: true },
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });

      const getResponse = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        spaceId: SPACE_ID,
      });

      expect(getResponse.body[0].namespaces).eql(['*']);
      expect(getResponse.body[0].key).eql(testParam.key);
      expect(getResponse.body[0].value).eql(undefined);
    });

    it('should NOT return values for editor user', async () => {
      const editorTestParam = {
        key: 'editorTestParam',
        value: 'editorTestParamValue',
      };
      const postResp = await paramsApi.createParam({
        param: editorTestParam,
        auth: supertestEditorWithApiKey,
      });
      const getAllResp = await paramsApi.getParams({ auth: supertestEditorWithApiKey });
      const getResp = await paramsApi.getParam({
        paramId: postResp.body.id,
        auth: supertestEditorWithApiKey,
      });

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

      // Create a param first as admin
      const postRes = await paramsApi.createParam({
        param: syntheticsReadOnlyTestParam,
        auth: supertestAdminWithApiKey,
      });

      // Read params as read-only user
      const getAllResp = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_READ_ONLY });
      const getResp = await paramsApi.getParam({
        paramId: postRes.body.id,
        auth: ROLE_CONFIGS.SYNTHETICS_READ_ONLY,
      });

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.eql(undefined);
        expect(param.key).to.not.empty();
      });
      expect(getResp.body.value).to.eql(undefined);
      expect(getResp.body.key).to.eql(syntheticsReadOnlyTestParam.key);
    });

    it('SHOULD RETURN values for admin user', async () => {
      // skip in cloud until sub feature privileges are merged in serverless and statefull
      this.tags('skipCloud');
      const adminTestParam = {
        key: 'adminTestParam',
        value: 'adminTestParamValue',
      };
      const postResp = await paramsApi.createParam({
        param: adminTestParam,
        auth: supertestAdminWithApiKey,
      });
      const getAllResp = await paramsApi.getParams({ auth: supertestAdminWithApiKey });
      const getResp = await paramsApi.getParam({
        paramId: postResp.body.id,
        auth: supertestAdminWithApiKey,
      });

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

      // Create a param first as admin
      const postRes = await paramsApi.createParam({
        param: syntheticsAllRoleParam,
        auth: supertestAdminWithApiKey,
      });

      // Read params as user with ALL permissions
      const getAllResp = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      const getResp = await paramsApi.getParam({
        paramId: postRes.body.id,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.eql(undefined);
        expect(param.key).to.not.empty();
      });

      expect(getResp.body.key).eql(syntheticsAllRoleParam.key);
      expect(getResp.body.value).eql(undefined);
    });

    it('SHOULD RETURN values for custom role with ALL and read params subfeature privilege', async () => {
      // skip in cloud until sub feature privileges are merged in serverless and statefull
      this.tags('skipCloud');

      const syntheticsReadParamsTestParam = {
        key: 'syntheticsReadParamsTestParam',
        value: 'syntheticsReadParamsTestParamValue',
      };

      // Create a param first as user with read params privilege
      const postRes = await paramsApi.createParam({
        param: syntheticsReadParamsTestParam,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL_WITH_READ_PARAMS,
      });

      // Read params as user with read params privilege
      const getAllResp = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_ALL_WITH_READ_PARAMS,
      });

      const getResp = await paramsApi.getParam({
        paramId: postRes.body.id,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL_WITH_READ_PARAMS,
      });

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.not.empty();
        expect(param.key).to.not.empty();
      });

      expect(getResp.body.key).eql(syntheticsReadParamsTestParam.key);
      expect(getResp.body.value).eql(syntheticsReadParamsTestParam.value);
    });

    it('SHOULD RETURN values for custom role with MINIMAL_ALL and read params subfeature privilege', async () => {
      // skip in cloud until sub feature privileges are merged in serverless and statefull
      this.tags('skipCloud');

      const syntheticsReadParamsTestParam = {
        key: 'syntheticsReadParamsTestParam',
        value: 'syntheticsReadParamsTestParamValue',
      };

      // Create a param first as user with read params privilege
      const postRes = await paramsApi.createParam({
        param: syntheticsReadParamsTestParam,
        auth: ROLE_CONFIGS.SYNTHETICS_MINIMAL_ALL_WITH_READ_PARAMS,
      });

      // Read params as user with read params privilege
      const getAllResp = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_MINIMAL_ALL_WITH_READ_PARAMS,
      });

      const getResp = await paramsApi.getParam({
        paramId: postRes.body.id,
        auth: ROLE_CONFIGS.SYNTHETICS_MINIMAL_ALL_WITH_READ_PARAMS,
      });

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.not.empty();
        expect(param.key).to.not.empty();
      });

      expect(getResp.body.key).eql(syntheticsReadParamsTestParam.key);
      expect(getResp.body.value).eql(syntheticsReadParamsTestParam.value);
    });

    it('SHOULD RETURN values for custom role with READ and read params subfeature privilege', async () => {
      // skip in cloud until sub feature privileges are merged in serverless and statefull
      this.tags('skipCloud');

      const syntheticsReadParamsTestParam = {
        key: 'syntheticsReadParamsTestParam',
        value: 'syntheticsReadParamsTestParamValue',
      };

      // Create a param first as admin
      const postRes = await paramsApi.createParam({
        param: syntheticsReadParamsTestParam,
        auth: supertestAdminWithApiKey,
      });

      // Read params as user with read params privilege
      const getAllResp = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_READ_WITH_READ_PARAMS,
      });

      const getResp = await paramsApi.getParam({
        paramId: postRes.body.id,
        auth: ROLE_CONFIGS.SYNTHETICS_READ_WITH_READ_PARAMS,
      });

      getAllResp.body.forEach((param: any) => {
        expect(param.value).to.not.empty();
        expect(param.key).to.not.empty();
      });

      expect(getResp.body.key).eql(syntheticsReadParamsTestParam.key);
      expect(getResp.body.value).eql(syntheticsReadParamsTestParam.value);
    });

    it('should handle bulk deleting params', async () => {
      await kServer.savedObjects.clean({ types: [syntheticsParamType] });

      const params = [
        { key: 'param1', value: 'value1' },
        { key: 'param2', value: 'value2' },
        { key: 'param3', value: 'value3' },
      ];

      for (const param of params) {
        await paramsApi.createParam({ param, auth: ROLE_CONFIGS.SYNTHETICS_ALL });
      }

      const getResponse = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      expect(getResponse.body.length).to.eql(3);

      const ids = getResponse.body.map((param: any) => param.id);

      await paramsApi.bulkDeleteParams({ ids, auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      const getResponseAfterDelete = await paramsApi.getParams({
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });

      expect(getResponseAfterDelete.body.length).to.eql(0);
    });

    it('handles single parameter deletion', async () => {
      const postResp = await paramsApi.createParam({
        param: { key: 'to-be-deleted', value: 'value' },
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
      });

      const paramId = postResp.body.id;

      const getResp = await paramsApi.getParam({ paramId, auth: ROLE_CONFIGS.SYNTHETICS_ALL });
      expect(getResp.body.key).to.eql('to-be-deleted');

      await paramsApi.deleteParam({ paramId, auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      await paramsApi.getParam({
        paramId,
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        expectedStatus: 404,
      });
    });

    // it does not work like this today - need to check how duplicates are handled
    // Bug ticket https://github.com/elastic/kibana/issues/243894
    it.skip('returns a 409 conflict when creating a duplicate key', async () => {
      const param = { key: 'duplicate-key', value: 'value1' };
      await paramsApi.createParam({ param, auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      await paramsApi.createParam({
        param: { ...param, value: 'value2' },
        auth: ROLE_CONFIGS.SYNTHETICS_ALL,
        expectedStatus: 409,
      });

      const getAllResp = await paramsApi.getParams({ auth: ROLE_CONFIGS.SYNTHETICS_ALL });

      const noDuplicates = getAllResp.body.filter((p: any) => p.key === param.key);
      expect(noDuplicates.length).to.eql(1);
    });

    it('returns 403 for a user with no synthetics privileges', async () => {
      await paramsApi.getParams({ auth: ROLE_CONFIGS.NO_SYNTHETICS, expectedStatus: 403 });

      await paramsApi.createParam({
        param: { key: 'foo', value: 'bar' },
        auth: ROLE_CONFIGS.NO_SYNTHETICS,
        expectedStatus: 403,
      });

      await paramsApi.updateParam({
        paramId: 'some-id',
        param: { key: 'foo', value: 'bar' },
        auth: ROLE_CONFIGS.NO_SYNTHETICS,
        expectedStatus: 403,
      });

      await paramsApi.deleteParam({
        paramId: 'some-id',
        auth: ROLE_CONFIGS.NO_SYNTHETICS,
        expectedStatus: 403,
      });
    });
  });
}

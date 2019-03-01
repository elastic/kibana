/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { SuperTest } from 'supertest';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { getIdPrefix, getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface ExportByTypeTest {
  statusCode: number;
  description: string;
  response: (resp: { [key: string]: any }) => void;
}

interface ExportByTypeTests {
  spaceAwareType: ExportByTypeTest;
  noTypeOrObjects: ExportByTypeTest;
}

interface ExportByTypeTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: ExportByTypeTests;
}

export function exportByTypeTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to find ${type}, missing action:saved_objects/${type}/find`,
    });
  };

  const expectTypeOrObjectsRequired = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 400,
      error: 'Bad Request',
      message: '"value" must be an object',
      validation: { source: 'payload', keys: ['value'] },
    });
  };

  const createExpectVisualizationResults = (spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    const response = JSON.parse(resp.text);
    expect(response).to.eql({
      type: 'visualization',
      id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
      version: response.version,
      attributes: response.attributes,
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: `${getIdPrefix(spaceId)}91200a00-9efd-11e7-acb3-3dab96693fab`,
        },
      ],
      migrationVersion: { visualization: '7.0.0' },
      updated_at: '2017-09-21T18:51:23.794Z',
    });
  };

  const makeExportByTypeTest = (describeFn: DescribeFn) => (
    description: string,
    definition: ExportByTypeTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`space aware type should return ${tests.spaceAwareType.statusCode} with ${
        tests.spaceAwareType.description
      }`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export_by_type/visualization`)
          .auth(user.username, user.password)
          .expect(tests.spaceAwareType.statusCode)
          .then(tests.spaceAwareType.response);
      });

      describe('no type', () => {
        it(`should return ${tests.noTypeOrObjects.statusCode} with ${
          tests.noTypeOrObjects.description
        }`, async () => {
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export_by_type`)
            .auth(user.username, user.password)
            .expect(tests.noTypeOrObjects.statusCode)
            .then(tests.noTypeOrObjects.response);
        });
      });
    });
  };

  const exportByTypeTest = makeExportByTypeTest(describe);
  // @ts-ignore
  exportByTypeTest.only = makeExportByTypeTest(describe.only);

  return {
    createExpectRbacForbidden,
    expectTypeOrObjectsRequired,
    createExpectVisualizationResults,
    exportByTypeTest,
  };
}

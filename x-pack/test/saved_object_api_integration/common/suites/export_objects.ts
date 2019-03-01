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

interface ExportObjectsTest {
  statusCode: number;
  description: string;
  response: (resp: { [key: string]: any }) => void;
}

interface ExportObjectsTests {
  spaceAwareType: ExportObjectsTest;
  noTypeOrObjects: ExportObjectsTest;
}

interface ExportObjectsTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: ExportObjectsTests;
}

export function exportObjectsTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to bulk_get ${type}, missing action:saved_objects/${type}/bulk_get`,
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

  const makeExportObjectsTest = (describeFn: DescribeFn) => (
    description: string,
    definition: ExportObjectsTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`space aware type should return ${tests.spaceAwareType.statusCode} with ${
        tests.spaceAwareType.description
      }`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export_objects`)
          .send({
            objects: [
              {
                type: 'visualization',
                id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
              },
            ],
          })
          .auth(user.username, user.password)
          .expect(tests.spaceAwareType.statusCode)
          .then(tests.spaceAwareType.response);
      });

      describe('no objects', () => {
        it(`should return ${tests.noTypeOrObjects.statusCode} with ${
          tests.noTypeOrObjects.description
        }`, async () => {
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export_objects`)
            .auth(user.username, user.password)
            .expect(tests.noTypeOrObjects.statusCode)
            .then(tests.noTypeOrObjects.response);
        });
      });
    });
  };

  const exportObjectsTest = makeExportObjectsTest(describe);
  // @ts-ignore
  exportObjectsTest.only = makeExportObjectsTest(describe.only);

  return {
    createExpectRbacForbidden,
    expectTypeOrObjectsRequired,
    createExpectVisualizationResults,
    exportObjectsTest,
  };
}

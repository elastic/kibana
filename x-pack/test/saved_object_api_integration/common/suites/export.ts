/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { getIdPrefix, getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface ExportTest {
  statusCode: number;
  description: string;
  response: (resp: { [key: string]: any }) => void;
}

interface ExportTests {
  spaceAwareType: ExportTest;
  noTypeOrObjects: ExportTest;
}

interface ExportTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: ExportTests;
}

export function exportTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    // In export only, the API uses "bulk_get" or "find" depending on the parameters it receives.
    // The best that could be done here is to have an if statement to ensure at least one of the
    // two errors has been thrown.
    if (resp.body.message.indexOf(`bulk_get`) !== -1) {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to bulk_get ${type}`,
      });
      return;
    }
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to find ${type}`,
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
      migrationVersion: response.migrationVersion,
      updated_at: '2017-09-21T18:51:23.794Z',
    });
  };

  const makeExportTest = (describeFn: DescribeFn) => (
    description: string,
    definition: ExportTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`space aware type should return ${tests.spaceAwareType.statusCode} with ${
        tests.spaceAwareType.description
      } when querying by type`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export`)
          .send({
            type: 'visualization',
          })
          .auth(user.username, user.password)
          .expect(tests.spaceAwareType.statusCode)
          .then(tests.spaceAwareType.response);
      });

      it(`space aware type should return ${tests.spaceAwareType.statusCode} with ${
        tests.spaceAwareType.description
      } when querying by objects`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export`)
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

      describe('no type or objects', () => {
        it(`should return ${tests.noTypeOrObjects.statusCode} with ${
          tests.noTypeOrObjects.description
        }`, async () => {
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/_export`)
            .auth(user.username, user.password)
            .expect(tests.noTypeOrObjects.statusCode)
            .then(tests.noTypeOrObjects.response);
        });
      });
    });
  };

  const exportTest = makeExportTest(describe);
  // @ts-ignore
  exportTest.only = makeExportTest(describe.only);

  return {
    createExpectRbacForbidden,
    expectTypeOrObjectsRequired,
    createExpectVisualizationResults,
    exportTest,
  };
}

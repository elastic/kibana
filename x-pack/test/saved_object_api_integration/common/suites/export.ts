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

interface ExportTest {
  statusCode: number;
  description: string;
  response: (resp: { [key: string]: any }) => void;
}

interface ExportTests {
  spaceAwareType: ExportTest;
  notSpaceAwareType: ExportTest;
  unknownType: ExportTest;
}

interface ExportTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: ExportTests;
}

export function exportTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectEmpty = () => (resp: { [key: string]: any }) => {
    expect(resp.text).to.eql('');
  };

  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    // In export only, the API uses "bulk_get" or "find" depending on the parameters it receives.
    // The best that could be done here is to have an if statement to ensure at least one of the
    // two errors has been thrown.
    if (resp.body.message.indexOf(`bulk_get`) !== -1) {
      expect(resp.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to bulk_get ${type}, missing action:saved_objects/${type}/bulk_get`,
      });
      return;
    }
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to find ${type}, missing action:saved_objects/${type}/find`,
    });
  };

  const expectNotSpaceAwareResults = (resp: { [key: string]: any }) => {
    const response = JSON.parse(resp.text);
    expect(response).to.eql({
      type: 'globaltype',
      id: '8121a00-8efd-21e7-1cb3-34ab966434445',
      attributes: { name: 'My favorite global object' },
      references: [],
      updated_at: '2017-09-21T18:59:16.270Z',
      version: response.version,
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
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_export?type=visualization`)
          .auth(user.username, user.password)
          .expect(tests.spaceAwareType.statusCode)
          .then(tests.spaceAwareType.response);
      });

      it(`space aware type should return ${tests.spaceAwareType.statusCode} with ${
        tests.spaceAwareType.description
      } when querying by objects`, async () => {
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_export`)
          .query({
            objects: JSON.stringify([
              {
                type: 'visualization',
                id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
              },
            ]),
          })
          .auth(user.username, user.password)
          .expect(tests.spaceAwareType.statusCode)
          .then(tests.spaceAwareType.response);
      });

      it(`not space aware type should return ${tests.notSpaceAwareType.statusCode} with ${
        tests.notSpaceAwareType.description
      } when querying by type`, async () => {
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_export?type=globaltype`)
          .auth(user.username, user.password)
          .expect(tests.notSpaceAwareType.statusCode)
          .then(tests.notSpaceAwareType.response);
      });

      it(`not space aware type should return ${tests.notSpaceAwareType.statusCode} with ${
        tests.notSpaceAwareType.description
      } when querying by objects`, async () => {
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_export`)
          .query({
            objects: JSON.stringify([
              {
                type: 'globaltype',
                id: '8121a00-8efd-21e7-1cb3-34ab966434445',
              },
            ]),
          })
          .auth(user.username, user.password)
          .expect(tests.notSpaceAwareType.statusCode)
          .then(tests.notSpaceAwareType.response);
      });

      describe('unknown type', () => {
        it(`should return ${tests.unknownType.statusCode} with ${
          tests.unknownType.description
        } when querying by type`, async () => {
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_export?type=wigwags`)
            .auth(user.username, user.password)
            .expect(tests.unknownType.statusCode)
            .then(tests.unknownType.response);
        });

        it(`should return ${tests.unknownType.statusCode} with ${
          tests.unknownType.description
        } when querying by objects`, async () => {
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_export`)
            .query({
              objects: JSON.stringify([{ type: 'wigwags', id: '123' }]),
            })
            .auth(user.username, user.password)
            .expect(tests.unknownType.statusCode)
            .then(tests.unknownType.response);
        });
      });
    });
  };

  const exportTest = makeExportTest(describe);
  // @ts-ignore
  exportTest.only = makeExportTest(describe.only);

  return {
    createExpectEmpty,
    createExpectRbacForbidden,
    createExpectVisualizationResults,
    expectNotSpaceAwareResults,
    exportTest,
  };
}

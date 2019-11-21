/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface GetAllTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface GetAllTests {
  exists: GetAllTest;
  copySavedObjectsPurpose: GetAllTest;
}

interface GetAllTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId: string;
  tests: GetAllTests;
}

export function getAllTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectResults = (...spaceIds: string[]) => (resp: { [key: string]: any }) => {
    const expectedBody = [
      {
        id: 'default',
        name: 'Default Space',
        description: 'This is the default space',
        _reserved: true,
        disabledFeatures: [],
      },
      {
        id: 'space_1',
        name: 'Space 1',
        description: 'This is the first test space',
        disabledFeatures: [],
      },
      {
        id: 'space_2',
        name: 'Space 2',
        description: 'This is the second test space',
        disabledFeatures: [],
      },
    ].filter(entry => spaceIds.includes(entry.id));
    expect(resp.body).to.eql(expectedBody);
  };

  const expectEmptyResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql('');
  };

  const expectRbacForbidden = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Forbidden',
      message: 'Forbidden',
      statusCode: 403,
    });
  };

  const makeGetAllTest = (describeFn: DescribeFn) => (
    description: string,
    { user = {}, spaceId, tests }: GetAllTestDefinition
  ) => {
    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.exists.statusCode}`, async () => {
        return supertest
          .get(`${getUrlPrefix(spaceId)}/api/spaces/space`)
          .auth(user.username, user.password)
          .expect(tests.exists.statusCode)
          .then(tests.exists.response);
      });

      describe('copySavedObjects purpose', () => {
        it(`should return ${tests.copySavedObjectsPurpose.statusCode}`, async () => {
          return supertest
            .get(`${getUrlPrefix(spaceId)}/api/spaces/space`)
            .query({ purpose: 'copySavedObjectsIntoSpace' })
            .auth(user.username, user.password)
            .expect(tests.copySavedObjectsPurpose.statusCode)
            .then(tests.copySavedObjectsPurpose.response);
        });
      });
    });
  };

  const getAllTest = makeGetAllTest(describe);
  // @ts-ignore
  getAllTest.only = makeGetAllTest(describe.only);

  return {
    createExpectResults,
    expectRbacForbidden,
    getAllTest,
    expectEmptyResult,
  };
}

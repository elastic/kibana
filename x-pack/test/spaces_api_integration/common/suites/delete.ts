/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { SuperTest } from 'supertest';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface DeleteTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface DeleteTests {
  exists: DeleteTest;
  reservedSpace: DeleteTest;
  doesntExist: DeleteTest;
}

interface DeleteTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId: string;
  tests: DeleteTests;
}

export function deleteTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectLegacyForbidden = (username: string, action: string) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `action [indices:data/${action}] is unauthorized for user [${username}]: [security_exception] action [indices:data/${action}] is unauthorized for user [${username}]`,
    });
  };

  const createExpectResult = (expectedResult: any) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql(expectedResult);
  };

  const expectEmptyResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql('');
  };

  const expectNotFound = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Not Found',
      statusCode: 404,
    });
  };

  const expectRbacForbidden = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unauthorized to delete spaces',
    });
  };

  const expectReservedSpaceResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Bad Request',
      statusCode: 400,
      message: `This Space cannot be deleted because it is reserved.`,
    });
  };

  const makeDeleteTest = (describeFn: DescribeFn) => (
    description: string,
    { user = {}, spaceId, tests }: DeleteTestDefinition
  ) => {
    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.exists.statusCode}`, async () => {
        return supertest
          .delete(`${getUrlPrefix(spaceId)}/api/spaces/space/space_2`)
          .auth(user.username, user.password)
          .expect(tests.exists.statusCode)
          .then(tests.exists.response);
      });

      describe(`when the space is reserved`, async () => {
        it(`should return ${tests.reservedSpace.statusCode}`, async () => {
          return supertest
            .delete(`${getUrlPrefix(spaceId)}/api/spaces/space/default`)
            .auth(user.username, user.password)
            .expect(tests.reservedSpace.statusCode)
            .then(tests.reservedSpace.response);
        });
      });

      describe(`when the space doesn't exist`, () => {
        it(`should return ${tests.doesntExist.statusCode}`, async () => {
          return supertest
            .delete(`${getUrlPrefix(spaceId)}/api/spaces/space/space_3`)
            .auth(user.username, user.password)
            .expect(tests.doesntExist.statusCode)
            .then(tests.doesntExist.response);
        });
      });
    });
  };

  const deleteTest = makeDeleteTest(describe);
  // @ts-ignore
  deleteTest.only = makeDeleteTest(describe.only);

  return {
    createExpectLegacyForbidden,
    createExpectResult,
    deleteTest,
    expectEmptyResult,
    expectNotFound,
    expectRbacForbidden,
    expectReservedSpaceResult,
  };
}

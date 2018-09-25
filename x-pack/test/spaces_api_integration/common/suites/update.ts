/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from 'expect.js';
import { SuperTest } from 'supertest';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface UpdateTest {
  statusCode: number;
  response: (resp: any) => void;
}

interface UpdateTests {
  alreadyExists: UpdateTest;
  defaultSpace: UpdateTest;
  newSpace: UpdateTest;
}

interface UpdateTestDefinition {
  auth?: TestDefinitionAuthentication;
  spaceId: string;
  tests: UpdateTests;
}

export function updateTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectRbacForbidden = (resp: any) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unauthorized to update spaces',
    });
  };

  const createExpectLegacyForbidden = (username: string) => (resp: any) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `action [indices:data/write/update] is unauthorized for user [${username}]: [security_exception] action [indices:data/write/update] is unauthorized for user [${username}]`,
    });
  };

  const expectNotFound = (resp: any) => {
    expect(resp.body).to.eql({
      error: 'Not Found',
      statusCode: 404,
    });
  };

  const expectDefaultSpaceResult = (resp: any) => {
    expect(resp.body).to.eql({
      name: 'the new default',
      id: 'default',
      description: 'a description',
      color: '#ffffff',
      _reserved: true,
    });
  };

  const expectAlreadyExistsResult = (resp: any) => {
    expect(resp.body).to.eql({
      name: 'space 1',
      id: 'space_1',
      description: 'a description',
      color: '#5c5959',
    });
  };

  const makeUpdateTest = (describeFn: DescribeFn) => (
    description: string,
    { auth = {}, spaceId, tests }: UpdateTestDefinition
  ) => {
    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.alreadyExists.statusCode}`, async () => {
        return supertest
          .put(`${getUrlPrefix(spaceId)}/api/spaces/space/space_1`)
          .auth(auth.username, auth.password)
          .send({
            name: 'space 1',
            id: 'space_1',
            description: 'a description',
            color: '#5c5959',
            _reserved: true,
          })
          .expect(tests.alreadyExists.statusCode)
          .then(tests.alreadyExists.response);
      });

      describe(`default space`, () => {
        it(`should return ${tests.defaultSpace.statusCode}`, async () => {
          return supertest
            .put(`${getUrlPrefix(spaceId)}/api/spaces/space/default`)
            .auth(auth.username, auth.password)
            .send({
              name: 'the new default',
              id: 'default',
              description: 'a description',
              color: '#ffffff',
              _reserved: false,
            })
            .expect(tests.defaultSpace.statusCode)
            .then(tests.defaultSpace.response);
        });
      });

      describe(`when space doesn't exist`, () => {
        it(`should return ${tests.newSpace.statusCode}`, async () => {
          return supertest
            .put(`${getUrlPrefix(spaceId)}/api/spaces/space/marketing`)
            .auth(auth.username, auth.password)
            .send({
              name: 'marketing',
              id: 'marketing',
              description: 'a description',
              color: '#5c5959',
            })
            .expect(tests.newSpace.statusCode)
            .then(tests.newSpace.response);
        });
      });
    });
  };

  const updateTest = makeUpdateTest(describe);
  // @ts-ignore
  updateTest.only = makeUpdateTest(describe.only);

  return {
    createExpectLegacyForbidden,
    expectAlreadyExistsResult,
    expectDefaultSpaceResult,
    expectNotFound,
    expectRbacForbidden,
    updateTest,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface CreateTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface CreateTests {
  newSpace: CreateTest;
  alreadyExists: CreateTest;
  reservedSpecified: CreateTest;
}

interface CreateTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId: string;
  tests: CreateTests;
}

export function createTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectConflictResponse = (resp: { [key: string]: any }) => {
    expect(resp.body).to.only.have.keys(['error', 'message', 'statusCode']);
    expect(resp.body.error).to.equal('Conflict');
    expect(resp.body.statusCode).to.equal(409);
    expect(resp.body.message).to.match(new RegExp(`A space with the identifier .*`));
  };

  const expectNewSpaceResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      name: 'marketing',
      id: 'marketing',
      description: 'a description',
      color: '#5c5959',
      disabledFeatures: [],
    });
  };

  const expectRbacForbiddenResponse = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Unauthorized to create spaces',
    });
  };

  const expectReservedSpecifiedResult = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      name: 'reserved space',
      id: 'reserved',
      description: 'a description',
      color: '#5c5959',
      disabledFeatures: [],
    });
  };

  const makeCreateTest = (describeFn: DescribeFn) => (
    description: string,
    { user = {}, spaceId, tests }: CreateTestDefinition
  ) => {
    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.newSpace.statusCode}`, async () => {
        return supertest
          .post(`${getUrlPrefix(spaceId)}/api/spaces/space`)
          .auth(user.username, user.password)
          .send({
            name: 'marketing',
            id: 'marketing',
            description: 'a description',
            color: '#5c5959',
            disabledFeatures: [],
          })
          .expect(tests.newSpace.statusCode)
          .then(tests.newSpace.response);
      });

      describe('when it already exists', () => {
        it(`should return ${tests.alreadyExists.statusCode}`, async () => {
          return supertest
            .post(`${getUrlPrefix(spaceId)}/api/spaces/space`)
            .auth(user.username, user.password)
            .send({
              name: 'space_1',
              id: 'space_1',
              color: '#ffffff',
              description: 'a description',
              disabledFeatures: [],
            })
            .expect(tests.alreadyExists.statusCode)
            .then(tests.alreadyExists.response);
        });
      });

      describe('when _reserved is specified', () => {
        it(`should return ${tests.reservedSpecified.statusCode} and ignore _reserved`, async () => {
          return supertest
            .post(`${getUrlPrefix(spaceId)}/api/spaces/space`)
            .auth(user.username, user.password)
            .send({
              name: 'reserved space',
              id: 'reserved',
              description: 'a description',
              color: '#5c5959',
              _reserved: true,
              disabledFeatures: [],
            })
            .expect(tests.reservedSpecified.statusCode)
            .then(tests.reservedSpecified.response);
        });
      });
    });
  };

  const createTest = makeCreateTest(describe);
  // @ts-ignore
  createTest.only = makeCreateTest(describe.only);

  return {
    createTest,
    expectConflictResponse,
    expectNewSpaceResult,
    expectRbacForbiddenResponse,
    expectReservedSpecifiedResult,
  };
}

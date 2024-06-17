/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { getTestScenariosForSpace } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface CreateTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface CreateTests {
  newSpace: CreateTest;
  alreadyExists: CreateTest;
  reservedSpecified: CreateTest;
  solutionSpecified: CreateTest;
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

  const expectSolutionSpecifiedResult = (resp: Record<string, any>) => {
    expect(resp.body).to.eql({
      id: 'solution',
      name: 'space with solution',
      description: 'a description',
      color: '#5c5959',
      disabledFeatures: [],
      solution: 'search',
    });
  };

  const makeCreateTest =
    (describeFn: DescribeFn) =>
    (description: string, { user = {}, spaceId, tests }: CreateTestDefinition) => {
      describeFn(description, () => {
        beforeEach(() =>
          esArchiver.load(
            'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          )
        );
        afterEach(() =>
          esArchiver.unload(
            'x-pack/test/spaces_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
          )
        );

        getTestScenariosForSpace(spaceId).forEach(({ urlPrefix, scenario }) => {
          it(`should return ${tests.newSpace.statusCode} ${scenario}`, async () => {
            return supertest
              .post(`${urlPrefix}/api/spaces/space`)
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
            it(`should return ${tests.alreadyExists.statusCode} ${scenario}`, async () => {
              return supertest
                .post(`${urlPrefix}/api/spaces/space`)
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
            it(`should return ${tests.reservedSpecified.statusCode} and ignore _reserved ${scenario}`, async () => {
              return supertest
                .post(`${urlPrefix}/api/spaces/space`)
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

          describe('when solution is specified', () => {
            it(`should return ${tests.solutionSpecified.statusCode}`, async () => {
              return supertest
                .post(`${urlPrefix}/api/spaces/space`)
                .auth(user.username, user.password)
                .send({
                  name: 'space with solution',
                  id: 'solution',
                  description: 'a description',
                  color: '#5c5959',
                  solution: 'search',
                  disabledFeatures: [],
                })
                .expect(tests.solutionSpecified.statusCode)
                .then(tests.solutionSpecified.response);
            });
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
    expectSolutionSpecifiedResult,
  };
}

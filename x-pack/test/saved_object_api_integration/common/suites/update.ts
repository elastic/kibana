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

interface UpdateTest {
  statusCode: number;
  response: (resp: any) => void;
}

interface UpdateTests {
  spaceAware: UpdateTest;
  notSpaceAware: UpdateTest;
  doesntExist: UpdateTest;
}

interface UpdateTestDefinition {
  auth?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: UpdateTests;
}

export function updateTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const makeUpdateTest = (describeFn: DescribeFn) => (
    description: string,
    definition: UpdateTestDefinition
  ) => {
    const { auth = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      beforeEach(() => esArchiver.load('saved_objects/spaces'));
      afterEach(() => esArchiver.unload('saved_objects/spaces'));
      it(`should return ${tests.spaceAware.statusCode} for a space-aware doc`, async () => {
        await supertest
          .put(
            `${getUrlPrefix(spaceId)}/api/saved_objects/visualization/${getIdPrefix(
              spaceId
            )}dd7caf20-9efd-11e7-acb3-3dab96693fab`
          )
          .auth(auth.username, auth.password)
          .send({
            attributes: {
              title: 'My second favorite vis',
            },
          })
          .expect(tests.spaceAware.statusCode)
          .then(tests.spaceAware.response);
      });

      it(`should return ${tests.notSpaceAware.statusCode} for a non space-aware doc`, async () => {
        await supertest
          .put(
            `${getUrlPrefix(
              spaceId
            )}/api/saved_objects/globaltype/8121a00-8efd-21e7-1cb3-34ab966434445`
          )
          .auth(auth.username, auth.password)
          .send({
            attributes: {
              name: 'My second favorite',
            },
          })
          .expect(tests.notSpaceAware.statusCode)
          .then(tests.notSpaceAware.response);
      });

      describe('unknown id', () => {
        it(`should return ${tests.doesntExist.statusCode}`, async () => {
          await supertest
            .put(`${getUrlPrefix(spaceId)}/api/saved_objects/visualization/not an id`)
            .auth(auth.username, auth.password)
            .send({
              attributes: {
                title: 'My second favorite vis',
              },
            })
            .expect(tests.doesntExist.statusCode)
            .then(tests.doesntExist.response);
        });
      });
    });
  };

  const updateTest = makeUpdateTest(describe);
  // @ts-ignore
  updateTest.only = makeUpdateTest(describe.only);

  const createExpectLegacyForbidden = (username: string) => (resp: any) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      // eslint-disable-next-line max-len
      message: `action [indices:data/write/update] is unauthorized for user [${username}]: [security_exception] action [indices:data/write/update] is unauthorized for user [${username}]`,
    });
  };

  const expectSpaceAwareResults = (resp: any) => {
    // loose uuid validation ignoring prefix
    expect(resp.body)
      .to.have.property('id')
      .match(/[0-9a-f-]{36}$/);

    // loose ISO8601 UTC time with milliseconds validation
    expect(resp.body)
      .to.have.property('updated_at')
      .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

    expect(resp.body).to.eql({
      id: resp.body.id,
      type: 'visualization',
      updated_at: resp.body.updated_at,
      version: 2,
      attributes: {
        title: 'My second favorite vis',
      },
    });
  };

  const expectNotSpaceAwareResults = (resp: any) => {
    // loose uuid validation
    expect(resp.body)
      .to.have.property('id')
      .match(/^[0-9a-f-]{36}$/);

    // loose ISO8601 UTC time with milliseconds validation
    expect(resp.body)
      .to.have.property('updated_at')
      .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

    expect(resp.body).to.eql({
      id: resp.body.id,
      type: 'globaltype',
      updated_at: resp.body.updated_at,
      version: 2,
      attributes: {
        name: 'My second favorite',
      },
    });
  };

  const expectNotFound = (resp: any) => {
    expect(resp.body).eql({
      statusCode: 404,
      error: 'Not Found',
      message: 'Saved object [visualization/not an id] not found',
    });
  };

  const createExpectRbacForbidden = (type: string) => (resp: any) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to update ${type}, missing action:saved_objects/${type}/update`,
    });
  };

  return {
    createExpectLegacyForbidden,
    expectDoesntExistRbacForbidden: createExpectRbacForbidden('visualization'),
    expectNotSpaceAwareResults,
    expectNotSpaceAwareRbacForbidden: createExpectRbacForbidden('globaltype'),
    expectNotFound,
    expectSpaceAwareResults,
    expectSpaceAwareRbacForbidden: createExpectRbacForbidden('visualization'),
    updateTest,
  };
}

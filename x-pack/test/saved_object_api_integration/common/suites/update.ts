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

interface UpdateTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface UpdateTests {
  spaceAware: UpdateTest;
  notSpaceAware: UpdateTest;
  hiddenType: UpdateTest;
  doesntExist: UpdateTest;
}

interface UpdateTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  otherSpaceId?: string;
  tests: UpdateTests;
}

export function updateTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectNotFound = (type: string, id: string, spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).eql({
      statusCode: 404,
      error: 'Not Found',
      message: `Saved object [${type}/${getIdPrefix(spaceId)}${id}] not found`,
    });
  };

  const createExpectDoesntExistNotFound = (spaceId?: string) => {
    return createExpectNotFound('visualization', 'not an id', spaceId);
  };

  const createExpectSpaceAwareNotFound = (spaceId?: string) => {
    return createExpectNotFound('visualization', 'dd7caf20-9efd-11e7-acb3-3dab96693fab', spaceId);
  };

  const expectHiddenTypeNotFound = createExpectNotFound(
    'hiddentype',
    'hiddentype_1',
    DEFAULT_SPACE_ID
  );

  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to update ${type}`,
    });
  };

  const expectDoesntExistRbacForbidden = createExpectRbacForbidden('visualization');

  const expectNotSpaceAwareRbacForbidden = createExpectRbacForbidden('globaltype');

  const expectHiddenTypeRbacForbidden = createExpectRbacForbidden('hiddentype');

  const expectNotSpaceAwareResults = (resp: { [key: string]: any }) => {
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
      version: resp.body.version,
      attributes: {
        name: 'My second favorite',
      },
    });
  };

  const expectSpaceAwareRbacForbidden = createExpectRbacForbidden('visualization');

  const expectSpaceAwareResults = (resp: { [key: string]: any }) => {
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
      version: resp.body.version,
      attributes: {
        title: 'My second favorite vis',
      },
    });
  };

  const makeUpdateTest = (describeFn: DescribeFn) => (
    description: string,
    definition: UpdateTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, otherSpaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));
      it(`should return ${tests.spaceAware.statusCode} for a space-aware doc`, async () => {
        await supertest
          .put(
            `${getUrlPrefix(spaceId)}/api/saved_objects/visualization/${getIdPrefix(
              otherSpaceId || spaceId
            )}dd7caf20-9efd-11e7-acb3-3dab96693fab`
          )
          .auth(user.username, user.password)
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
              otherSpaceId || spaceId
            )}/api/saved_objects/globaltype/8121a00-8efd-21e7-1cb3-34ab966434445`
          )
          .auth(user.username, user.password)
          .send({
            attributes: {
              name: 'My second favorite',
            },
          })
          .expect(tests.notSpaceAware.statusCode)
          .then(tests.notSpaceAware.response);
      });

      it(`should return ${tests.hiddenType.statusCode} for hiddentype doc`, async () => {
        await supertest
          .put(`${getUrlPrefix(otherSpaceId || spaceId)}/api/saved_objects/hiddentype/hiddentype_1`)
          .auth(user.username, user.password)
          .send({
            attributes: {
              name: 'My favorite hidden type',
            },
          })
          .expect(tests.hiddenType.statusCode)
          .then(tests.hiddenType.response);
      });

      describe('unknown id', () => {
        it(`should return ${tests.doesntExist.statusCode}`, async () => {
          await supertest
            .put(
              `${getUrlPrefix(spaceId)}/api/saved_objects/visualization/${getIdPrefix(
                spaceId
              )}not an id`
            )
            .auth(user.username, user.password)
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

  return {
    createExpectDoesntExistNotFound,
    createExpectSpaceAwareNotFound,
    expectSpaceNotFound: expectHiddenTypeNotFound,
    expectDoesntExistRbacForbidden,
    expectNotSpaceAwareRbacForbidden,
    expectNotSpaceAwareResults,
    expectSpaceAwareRbacForbidden,
    expectSpaceAwareResults,
    expectHiddenTypeRbacForbidden,
    updateTest,
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { DEFAULT_SPACE_ID } from '../../../../legacy/plugins/spaces/common/constants';
import { getIdPrefix, getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface DeleteTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface DeleteTests {
  spaceAware: DeleteTest;
  notSpaceAware: DeleteTest;
  hiddenType: DeleteTest;
  invalidId: DeleteTest;
}

interface DeleteTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  otherSpaceId?: string;
  tests: DeleteTests;
}

export function deleteTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectNotFound = (spaceId: string, type: string, id: string) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      statusCode: 404,
      error: 'Not Found',
      message: `Saved object [${type}/${getIdPrefix(spaceId)}${id}] not found`,
    });
  };

  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to delete ${type}`,
    });
  };

  const expectGenericNotFound = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 404,
      error: 'Not Found',
      message: `Not Found`,
    });
  };

  const createExpectSpaceAwareNotFound = (spaceId: string = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    createExpectNotFound(spaceId, 'dashboard', 'be3733a0-9efe-11e7-acb3-3dab96693fab')(resp);
  };

  const createExpectUnknownDocNotFound = (spaceId: string = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    createExpectNotFound(spaceId, 'dashboard', `not-a-real-id`)(resp);
  };

  const expectEmpty = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({});
  };

  const expectRbacInvalidIdForbidden = createExpectRbacForbidden('dashboard');

  const expectRbacNotSpaceAwareForbidden = createExpectRbacForbidden('globaltype');

  const expectRbacSpaceAwareForbidden = createExpectRbacForbidden('dashboard');

  const expectRbacHiddenTypeForbidden = createExpectRbacForbidden('hiddentype');

  const makeDeleteTest = (describeFn: DescribeFn) => (
    description: string,
    definition: DeleteTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, otherSpaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.spaceAware.statusCode} when deleting a space-aware doc`, async () =>
        await supertest
          .delete(
            `${getUrlPrefix(spaceId)}/api/saved_objects/dashboard/${getIdPrefix(
              otherSpaceId || spaceId
            )}be3733a0-9efe-11e7-acb3-3dab96693fab`
          )
          .auth(user.username, user.password)
          .expect(tests.spaceAware.statusCode)
          .then(tests.spaceAware.response));

      it(`should return ${tests.notSpaceAware.statusCode} when deleting a non-space-aware doc`, async () =>
        await supertest
          .delete(
            `${getUrlPrefix(
              spaceId
            )}/api/saved_objects/globaltype/8121a00-8efd-21e7-1cb3-34ab966434445`
          )
          .auth(user.username, user.password)
          .expect(tests.notSpaceAware.statusCode)
          .then(tests.notSpaceAware.response));

      it(`should return ${tests.hiddenType.statusCode} when deleting a hiddentype doc`, async () =>
        await supertest
          .delete(`${getUrlPrefix(spaceId)}/api/saved_objects/hiddentype/hiddentype_1`)
          .auth(user.username, user.password)
          .expect(tests.hiddenType.statusCode)
          .then(tests.hiddenType.response));

      it(`should return ${tests.invalidId.statusCode} when deleting an unknown doc`, async () =>
        await supertest
          .delete(
            `${getUrlPrefix(spaceId)}/api/saved_objects/dashboard/${getIdPrefix(
              otherSpaceId || spaceId
            )}not-a-real-id`
          )
          .auth(user.username, user.password)
          .expect(tests.invalidId.statusCode)
          .then(tests.invalidId.response));
    });
  };

  const deleteTest = makeDeleteTest(describe);
  // @ts-ignore
  deleteTest.only = makeDeleteTest(describe.only);

  return {
    expectGenericNotFound,
    createExpectSpaceAwareNotFound,
    createExpectUnknownDocNotFound,
    deleteTest,
    expectEmpty,
    expectRbacInvalidIdForbidden,
    expectRbacNotSpaceAwareForbidden,
    expectRbacSpaceAwareForbidden,
    expectRbacHiddenTypeForbidden,
  };
}

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

interface FindRelationshipsTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface FindRelationshipTests {
  spaceAware: FindRelationshipsTest;
  notSpaceAware: FindRelationshipsTest;
  doesntExist: FindRelationshipsTest;
}

interface FindRelationshipsTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  otherSpaceId?: string;
  tests: FindRelationshipTests;
}

const spaceAwareId = 'dd7caf20-9efd-11e7-acb3-3dab96693fab';
const notSpaceAwareId = '8121a00-8efd-21e7-1cb3-34ab966434445';
const doesntExistId = 'foobar';

export function findRelationshipsTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectDoesntExistNotFound = (spaceId = DEFAULT_SPACE_ID) => {
    return createExpectNotFound(doesntExistId, spaceId);
  };

  const createExpectLegacyForbidden = (username: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `action [indices:data/read/get] is unauthorized for user [${username}]: [security_exception] action [indices:data/read/get] is unauthorized for user [${username}]`,
    });
  };

  const createExpectNotFound = (id: string, spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      error: 'Not Found',
      message: `Saved object [visualization/${getIdPrefix(spaceId)}${id}] not found`,
      statusCode: 404,
    });
  };

  const createExpectNotSpaceAwareNotFound = (spaceId = DEFAULT_SPACE_ID) => {
    return createExpectNotFound(spaceAwareId, spaceId);
  };

  const createExpectNotSpaceAwareRbacForbidden = () => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Forbidden',
      message: `Unable to get globaltype, missing action:saved_objects/globaltype/get`,
      statusCode: 403,
    });
  };

  const createExpectNotSpaceAwareResults = (spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      id: `${notSpaceAwareId}`,
      type: 'globaltype',
      updated_at: '2017-09-21T18:59:16.270Z',
      version: resp.body.version,
      attributes: {
        name: 'My favorite global object',
      },
    });
  };

  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Forbidden',
      message: `Unable to find_relationships ${type}, missing action:saved_objects/${type}/find_relationships`,
      statusCode: 403,
    });
  };

  const createExpectSpaceAwareNotFound = (spaceId = DEFAULT_SPACE_ID) => {
    return createExpectNotFound(spaceAwareId, spaceId);
  };

  const expectSpaceAwareRbacForbidden = createExpectRbacForbidden('visualization');
  const expectNotSpaceAwareRbacForbidden = createExpectRbacForbidden('globaltype');
  const expectDoesntExistRbacForbidden = createExpectRbacForbidden('visualization');

  const createExpectSpaceAwareResults = (spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.have.property('index-pattern');
  };

  const makeFindRelationshipsTest = (describeFn: DescribeFn) => (
    description: string,
    definition: FindRelationshipsTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, otherSpaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${
        tests.spaceAware.statusCode
      } when finding relationships on a space aware doc`, async () => {
        await supertest
          .get(
            `${getUrlPrefix(
              spaceId
            )}/api/kibana/management/saved_objects/relationships/visualization/${getIdPrefix(
              otherSpaceId || spaceId
            )}${spaceAwareId}`
          )
          .auth(user.username, user.password)
          .expect(tests.spaceAware.statusCode)
          .then(tests.spaceAware.response);
      });

      describe('document does not exist', () => {
        it(`should return ${tests.doesntExist.statusCode}`, async () => {
          await supertest
            .get(
              `${getUrlPrefix(
                spaceId
              )}/api/kibana/management/saved_objects/relationships/visualization/${getIdPrefix(
                otherSpaceId || spaceId
              )}${doesntExistId}`
            )
            .auth(user.username, user.password)
            .expect(tests.doesntExist.statusCode)
            .then(tests.doesntExist.response);
        });
      });
    });
  };

  const findRelationshipsTest = makeFindRelationshipsTest(describe);
  // @ts-ignore
  findRelationshipsTest.only = makeFindRelationshipsTest(describe.only);

  return {
    createExpectDoesntExistNotFound,
    createExpectLegacyForbidden,
    createExpectNotSpaceAwareNotFound,
    createExpectNotSpaceAwareRbacForbidden,
    createExpectNotSpaceAwareResults,
    createExpectSpaceAwareNotFound,
    createExpectSpaceAwareResults,
    expectSpaceAwareRbacForbidden,
    expectNotSpaceAwareRbacForbidden,
    expectDoesntExistRbacForbidden,
    findRelationshipsTest,
  };
}

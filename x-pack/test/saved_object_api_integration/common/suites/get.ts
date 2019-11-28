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

interface GetTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface GetTests {
  spaceAware: GetTest;
  notSpaceAware: GetTest;
  hiddenType: GetTest;
  doesntExist: GetTest;
}

interface GetTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  otherSpaceId?: string;
  tests: GetTests;
}

const spaceAwareId = 'dd7caf20-9efd-11e7-acb3-3dab96693fab';
const notSpaceAwareId = '8121a00-8efd-21e7-1cb3-34ab966434445';
const doesntExistId = 'foobar';

export function getTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectDoesntExistNotFound = (spaceId = DEFAULT_SPACE_ID) => {
    return createExpectNotFound('visualization', doesntExistId, spaceId);
  };

  const createExpectNotFound = (type: string, id: string, spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      error: 'Not Found',
      message: `Saved object [${type}/${getIdPrefix(spaceId)}${id}] not found`,
      statusCode: 404,
    });
  };

  const expectHiddenTypeNotFound = createExpectNotFound(
    'hiddentype',
    'hiddentype_1',
    DEFAULT_SPACE_ID
  );

  const createExpectNotSpaceAwareRbacForbidden = () => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Forbidden',
      message: `Unable to get globaltype`,
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
      references: [],
    });
  };

  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Forbidden',
      message: `Unable to get ${type}`,
      statusCode: 403,
    });
  };

  const createExpectSpaceAwareNotFound = (spaceId = DEFAULT_SPACE_ID) => {
    return createExpectNotFound('visualization', spaceAwareId, spaceId);
  };

  const expectSpaceAwareRbacForbidden = createExpectRbacForbidden('visualization');
  const expectNotSpaceAwareRbacForbidden = createExpectRbacForbidden('globaltype');
  const expectHiddenTypeRbacForbidden = createExpectRbacForbidden('hiddentype');
  const expectDoesntExistRbacForbidden = createExpectRbacForbidden('visualization');

  const createExpectSpaceAwareResults = (spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
      type: 'visualization',
      migrationVersion: resp.body.migrationVersion,
      updated_at: '2017-09-21T18:51:23.794Z',
      version: resp.body.version,
      attributes: {
        title: 'Count of requests',
        description: '',
        version: 1,
        // cheat for some of the more complex attributes
        visState: resp.body.attributes.visState,
        uiStateJSON: resp.body.attributes.uiStateJSON,
        kibanaSavedObjectMeta: resp.body.attributes.kibanaSavedObjectMeta,
      },
      references: [
        {
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: `${getIdPrefix(spaceId)}91200a00-9efd-11e7-acb3-3dab96693fab`,
        },
      ],
    });
  };

  const makeGetTest = (describeFn: DescribeFn) => (
    description: string,
    definition: GetTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, otherSpaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.spaceAware.statusCode} when getting a space aware doc`, async () => {
        await supertest
          .get(
            `${getUrlPrefix(spaceId)}/api/saved_objects/visualization/${getIdPrefix(
              otherSpaceId || spaceId
            )}${spaceAwareId}`
          )
          .auth(user.username, user.password)
          .expect(tests.spaceAware.statusCode)
          .then(tests.spaceAware.response);
      });

      it(`should return ${tests.notSpaceAware.statusCode} when getting a non-space-aware doc`, async () => {
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/globaltype/${notSpaceAwareId}`)
          .auth(user.username, user.password)
          .expect(tests.notSpaceAware.statusCode)
          .then(tests.notSpaceAware.response);
      });

      it(`should return ${tests.hiddenType.statusCode} when getting a hiddentype doc`, async () => {
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/hiddentype/hiddentype_1`)
          .auth(user.username, user.password)
          .expect(tests.hiddenType.statusCode)
          .then(tests.hiddenType.response);
      });

      describe('document does not exist', () => {
        it(`should return ${tests.doesntExist.statusCode}`, async () => {
          await supertest
            .get(
              `${getUrlPrefix(spaceId)}/api/saved_objects/visualization/${getIdPrefix(
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

  const getTest = makeGetTest(describe);
  // @ts-ignore
  getTest.only = makeGetTest(describe.only);

  return {
    createExpectDoesntExistNotFound,
    createExpectNotSpaceAwareRbacForbidden,
    createExpectNotSpaceAwareResults,
    createExpectSpaceAwareNotFound,
    createExpectSpaceAwareResults,
    expectHiddenTypeNotFound,
    expectSpaceAwareRbacForbidden,
    expectNotSpaceAwareRbacForbidden,
    expectDoesntExistRbacForbidden,
    expectHiddenTypeRbacForbidden,
    getTest,
  };
}

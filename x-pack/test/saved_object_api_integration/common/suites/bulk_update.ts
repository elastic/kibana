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

interface BulkUpdateTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface BulkUpdateTests {
  spaceAware: BulkUpdateTest;
  notSpaceAware: BulkUpdateTest;
  hiddenType: BulkUpdateTest;
  doesntExist: BulkUpdateTest;
}

interface BulkUpdateTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  otherSpaceId?: string;
  tests: BulkUpdateTests;
}

export function bulkUpdateTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectNotFound = (type: string, id: string, spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    const [savedObject] = resp.body.saved_objects;
    expect(savedObject.error).eql({
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
      message: `Unable to bulk_update ${type}`,
    });
  };

  const expectDoesntExistRbacForbidden = createExpectRbacForbidden('visualization');

  const expectNotSpaceAwareRbacForbidden = createExpectRbacForbidden('globaltype');

  const expectHiddenTypeRbacForbidden = createExpectRbacForbidden('hiddentype');

  const expectNotSpaceAwareResults = (resp: { [key: string]: any }) => {
    const [savedObject] = resp.body.saved_objects;
    // loose uuid validation
    expect(savedObject)
      .to.have.property('id')
      .match(/^[0-9a-f-]{36}$/);

    // loose ISO8601 UTC time with milliseconds validation
    expect(savedObject)
      .to.have.property('updated_at')
      .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

    expect(savedObject).to.eql({
      id: savedObject.id,
      type: 'globaltype',
      updated_at: savedObject.updated_at,
      version: savedObject.version,
      attributes: {
        name: 'My second favorite',
      },
    });
  };

  const expectSpaceAwareRbacForbidden = createExpectRbacForbidden('visualization');

  const expectSpaceAwareResults = (resp: { [key: string]: any }) => {
    const [savedObject] = resp.body.saved_objects;
    // loose uuid validation ignoring prefix
    expect(savedObject)
      .to.have.property('id')
      .match(/[0-9a-f-]{36}$/);

    // loose ISO8601 UTC time with milliseconds validation
    expect(savedObject)
      .to.have.property('updated_at')
      .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

    expect(savedObject).to.eql({
      id: savedObject.id,
      type: 'visualization',
      updated_at: savedObject.updated_at,
      version: savedObject.version,
      attributes: {
        title: 'My second favorite vis',
      },
    });
  };

  const makeBulkUpdateTest = (describeFn: DescribeFn) => (
    description: string,
    definition: BulkUpdateTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, otherSpaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));
      it(`should return ${tests.spaceAware.statusCode} for a space-aware doc`, async () => {
        await supertest
          .put(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_update`)
          .auth(user.username, user.password)
          .send([
            {
              type: 'visualization',
              id: `${getIdPrefix(otherSpaceId || spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
              attributes: {
                title: 'My second favorite vis',
              },
            },
          ])
          .expect(tests.spaceAware.statusCode)
          .then(tests.spaceAware.response);
      });

      it(`should return ${tests.notSpaceAware.statusCode} for a non space-aware doc`, async () => {
        await supertest
          .put(`${getUrlPrefix(otherSpaceId || spaceId)}/api/saved_objects/_bulk_update`)
          .auth(user.username, user.password)
          .send([
            {
              type: 'globaltype',
              id: `8121a00-8efd-21e7-1cb3-34ab966434445`,
              attributes: {
                name: 'My second favorite',
              },
            },
          ])
          .expect(tests.notSpaceAware.statusCode)
          .then(tests.notSpaceAware.response);
      });

      it(`should return ${tests.hiddenType.statusCode} for hiddentype doc`, async () => {
        await supertest
          .put(`${getUrlPrefix(otherSpaceId || spaceId)}/api/saved_objects/_bulk_update`)
          .auth(user.username, user.password)
          .send([
            {
              type: 'hiddentype',
              id: 'hiddentype_1',
              attributes: {
                name: 'My favorite hidden type',
              },
            },
          ])
          .expect(tests.hiddenType.statusCode)
          .then(tests.hiddenType.response);
      });

      describe('unknown id', () => {
        it(`should return ${tests.doesntExist.statusCode}`, async () => {
          await supertest
            .put(`${getUrlPrefix(spaceId)}/api/saved_objects/_bulk_update`)
            .auth(user.username, user.password)
            .send([
              {
                type: 'visualization',
                id: `${getIdPrefix(spaceId)}not an id`,
                attributes: {
                  title: 'My second favorite vis',
                },
              },
            ])
            .expect(tests.doesntExist.statusCode)
            .then(tests.doesntExist.response);
        });
      });
    });
  };

  const bulkUpdateTest = makeBulkUpdateTest(describe);
  // @ts-ignore
  bulkUpdateTest.only = makeBulkUpdateTest(describe.only);

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
    bulkUpdateTest,
  };
}

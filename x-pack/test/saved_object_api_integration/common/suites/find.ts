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

interface FindTest {
  statusCode: number;
  description: string;
  response: (resp: any) => void;
}

interface FindTests {
  spaceAwareType: FindTest;
  notSpaceAwareType: FindTest;
  unknownType: FindTest;
  pageBeyondTotal: FindTest;
  unknownSearchField: FindTest;
  noType: FindTest;
}

interface FindTestDefinition {
  auth?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: FindTests;
}

// TODO: add space unaware type
export function findTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const makeFindTest = (describeFn: DescribeFn) => (
    description: string,
    definition: FindTestDefinition
  ) => {
    const { auth = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`space aware type should return ${tests.spaceAwareType.statusCode} with ${
        tests.spaceAwareType.description
      }`, async () =>
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=visualization&fields=title`)
          .auth(auth.username, auth.password)
          .expect(tests.spaceAwareType.statusCode)
          .then(tests.spaceAwareType.response));

      it(`not space aware type should return ${tests.spaceAwareType.statusCode} with ${
        tests.notSpaceAwareType.description
      }`, async () =>
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=globaltype&fields=name`)
          .auth(auth.username, auth.password)
          .expect(tests.notSpaceAwareType.statusCode)
          .then(tests.notSpaceAwareType.response));

      describe('unknown type', () => {
        it(`should return ${tests.unknownType.statusCode} with ${
          tests.unknownType.description
        }`, async () =>
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=wigwags`)
            .auth(auth.username, auth.password)
            .expect(tests.unknownType.statusCode)
            .then(tests.unknownType.response));
      });

      describe('page beyond total', () => {
        it(`should return ${tests.pageBeyondTotal.statusCode} with ${
          tests.pageBeyondTotal.description
        }`, async () =>
          await supertest
            .get(
              `${getUrlPrefix(
                spaceId
              )}/api/saved_objects/_find?type=visualization&page=100&per_page=100`
            )
            .auth(auth.username, auth.password)
            .expect(tests.pageBeyondTotal.statusCode)
            .then(tests.pageBeyondTotal.response));
      });

      describe('unknown search field', () => {
        it(`should return ${tests.unknownSearchField.statusCode} with ${
          tests.unknownSearchField.description
        }`, async () =>
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=wigwags&search_fields=a`)
            .auth(auth.username, auth.password)
            .expect(tests.unknownSearchField.statusCode)
            .then(tests.unknownSearchField.response));
      });

      describe('no type', () => {
        it(`should return ${tests.noType.statusCode} with ${tests.noType.description}`, async () =>
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find`)
            .auth(auth.username, auth.password)
            .expect(tests.noType.statusCode)
            .then(tests.noType.response));
      });
    });
  };

  const findTest = makeFindTest(describe);
  findTest.only = makeFindTest(describe.only);

  const createExpectEmpty = (page: number, perPage: number, total: number) => (resp: any) => {
    expect(resp.body).to.eql({
      page,
      per_page: perPage,
      total,
      saved_objects: [],
    });
  };

  const createExpectRbacForbidden = (type?: string) => (resp: any) => {
    const message = type
      ? `Unable to find ${type}, missing action:saved_objects/${type}/find`
      : `Not authorized to find saved_object`;

    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message,
    });
  };

  const createExpectLegacyForbidden = (username: string) => (resp: any) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      // eslint-disable-next-line max-len
      message: `action [indices:data/read/search] is unauthorized for user [${username}]: [security_exception] action [indices:data/read/search] is unauthorized for user [${username}]`,
    });
  };

  const createExpectResults = (spaceId = DEFAULT_SPACE_ID) => (resp: any) => {
    expect(resp.body).to.eql({
      page: 1,
      per_page: 20,
      total: 5,
      saved_objects: [
        {
          id: `${getIdPrefix(spaceId)}91200a00-9efd-11e7-acb3-3dab96693fab`,
          type: 'index-pattern',
          updated_at: '2017-09-21T18:49:16.270Z',
          version: 1,
          attributes: resp.body.saved_objects[0].attributes,
        },
        {
          id: '7.0.0-alpha1',
          type: 'config',
          updated_at: '2017-09-21T18:49:16.302Z',
          version: 1,
          attributes: resp.body.saved_objects[1].attributes,
        },
        {
          id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
          type: 'visualization',
          updated_at: '2017-09-21T18:51:23.794Z',
          version: 1,
          attributes: resp.body.saved_objects[2].attributes,
        },
        {
          id: `${getIdPrefix(spaceId)}be3733a0-9efe-11e7-acb3-3dab96693fab`,
          type: 'dashboard',
          updated_at: '2017-09-21T18:57:40.826Z',
          version: 1,
          attributes: resp.body.saved_objects[3].attributes,
        },
        {
          id: `8121a00-8efd-21e7-1cb3-34ab966434445`,
          type: 'globaltype',
          updated_at: '2017-09-21T18:59:16.270Z',
          version: 1,
          attributes: {
            name: 'My favorite global object',
          },
        },
      ],
    });
  };

  const expectNotSpaceAwareResults = (resp: any) => {
    expect(resp.body).to.eql({
      page: 1,
      per_page: 20,
      total: 1,
      saved_objects: [
        {
          type: 'globaltype',
          id: `8121a00-8efd-21e7-1cb3-34ab966434445`,
          version: 1,
          attributes: {
            name: 'My favorite global object',
          },
        },
      ],
    });
  };

  const createExpectVisualizationResults = (spaceId = DEFAULT_SPACE_ID) => (resp: any) => {
    expect(resp.body).to.eql({
      page: 1,
      per_page: 20,
      total: 1,
      saved_objects: [
        {
          type: 'visualization',
          id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
          version: 1,
          attributes: {
            title: 'Count of requests',
          },
        },
      ],
    });
  };

  return {
    createExpectEmpty,
    createExpectRbacForbidden,
    createExpectResults,
    createExpectLegacyForbidden,
    createExpectVisualizationResults,
    expectNotSpaceAwareResults,
    findTest,
  };
}

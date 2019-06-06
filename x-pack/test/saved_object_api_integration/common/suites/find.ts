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

interface FindTest {
  statusCode: number;
  description: string;
  response: (resp: { [key: string]: any }) => void;
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
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: FindTests;
}

export function findTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectEmpty = (page: number, perPage: number, total: number) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      page,
      per_page: perPage,
      total,
      saved_objects: [],
    });
  };

  const createExpectRbacForbidden = (type?: string) => (resp: { [key: string]: any }) => {
    const message = type ? `Unable to find ${type}` : `Not authorized to find saved_object`;

    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message,
    });
  };

  const expectNotSpaceAwareResults = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      page: 1,
      per_page: 20,
      total: 1,
      saved_objects: [
        {
          type: 'globaltype',
          id: `8121a00-8efd-21e7-1cb3-34ab966434445`,
          version: resp.body.saved_objects[0].version,
          attributes: {
            name: 'My favorite global object',
          },
          references: [],
          updated_at: '2017-09-21T18:59:16.270Z',
        },
      ],
    });
  };

  const expectTypeRequired = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Bad Request',
      message: 'child "type" fails because ["type" is required]',
      statusCode: 400,
      validation: {
        keys: ['type'],
        source: 'query',
      },
    });
  };

  const createExpectVisualizationResults = (spaceId = DEFAULT_SPACE_ID) => (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body).to.eql({
      page: 1,
      per_page: 20,
      total: 1,
      saved_objects: [
        {
          type: 'visualization',
          id: `${getIdPrefix(spaceId)}dd7caf20-9efd-11e7-acb3-3dab96693fab`,
          version: resp.body.saved_objects[0].version,
          attributes: {
            title: 'Count of requests',
          },
          migrationVersion: resp.body.saved_objects[0].migrationVersion,
          references: [
            {
              id: `${getIdPrefix(spaceId)}91200a00-9efd-11e7-acb3-3dab96693fab`,
              name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
              type: 'index-pattern',
            },
          ],
          updated_at: '2017-09-21T18:51:23.794Z',
        },
      ],
    });
  };

  const makeFindTest = (describeFn: DescribeFn) => (
    description: string,
    definition: FindTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`space aware type should return ${tests.spaceAwareType.statusCode} with ${
        tests.spaceAwareType.description
      }`, async () =>
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=visualization&fields=title`)
          .auth(user.username, user.password)
          .expect(tests.spaceAwareType.statusCode)
          .then(tests.spaceAwareType.response));

      it(`not space aware type should return ${tests.notSpaceAwareType.statusCode} with ${
        tests.notSpaceAwareType.description
      }`, async () =>
        await supertest
          .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=globaltype&fields=name`)
          .auth(user.username, user.password)
          .expect(tests.notSpaceAwareType.statusCode)
          .then(tests.notSpaceAwareType.response));

      describe('unknown type', () => {
        it(`should return ${tests.unknownType.statusCode} with ${
          tests.unknownType.description
        }`, async () =>
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=wigwags`)
            .auth(user.username, user.password)
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
            .auth(user.username, user.password)
            .expect(tests.pageBeyondTotal.statusCode)
            .then(tests.pageBeyondTotal.response));
      });

      describe('unknown search field', () => {
        it(`should return ${tests.unknownSearchField.statusCode} with ${
          tests.unknownSearchField.description
        }`, async () =>
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find?type=url&search_fields=a`)
            .auth(user.username, user.password)
            .expect(tests.unknownSearchField.statusCode)
            .then(tests.unknownSearchField.response));
      });

      describe('no type', () => {
        it(`should return ${tests.noType.statusCode} with ${tests.noType.description}`, async () =>
          await supertest
            .get(`${getUrlPrefix(spaceId)}/api/saved_objects/_find`)
            .auth(user.username, user.password)
            .expect(tests.noType.statusCode)
            .then(tests.noType.response));
      });
    });
  };

  const findTest = makeFindTest(describe);
  // @ts-ignore
  findTest.only = makeFindTest(describe.only);

  return {
    createExpectEmpty,
    createExpectRbacForbidden,
    createExpectVisualizationResults,
    expectNotSpaceAwareResults,
    expectTypeRequired,
    findTest,
  };
}

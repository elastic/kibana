/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface CreateTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface CreateCustomTest extends CreateTest {
  type: string;
  description: string;
  requestBody: any;
}

interface CreateTests {
  spaceAware: CreateTest;
  notSpaceAware: CreateTest;
  hiddenType: CreateTest;
  custom?: CreateCustomTest;
}

interface CreateTestDefinition {
  user?: TestDefinitionAuthentication;
  spaceId?: string;
  tests: CreateTests;
}

const spaceAwareType = 'visualization';
const notSpaceAwareType = 'globaltype';

export function createTestSuiteFactory(es: any, esArchiver: any, supertest: SuperTest<any>) {
  const createExpectRbacForbidden = (type: string) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unable to create ${type}`,
    });
  };

  const expectBadRequestForHiddenType = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      message: "Unsupported saved object type: 'hiddentype': Bad Request",
      statusCode: 400,
      error: 'Bad Request',
    });
  };

  const createExpectSpaceAwareResults = (spaceId = DEFAULT_SPACE_ID) => async (resp: {
    [key: string]: any;
  }) => {
    expect(resp.body)
      .to.have.property('id')
      .match(/^[0-9a-f-]{36}$/);

    // loose ISO8601 UTC time with milliseconds validation
    expect(resp.body)
      .to.have.property('updated_at')
      .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

    expect(resp.body).to.eql({
      id: resp.body.id,
      migrationVersion: resp.body.migrationVersion,
      type: spaceAwareType,
      updated_at: resp.body.updated_at,
      version: resp.body.version,
      attributes: {
        title: 'My favorite vis',
      },
      references: [],
    });

    const expectedSpacePrefix = spaceId === DEFAULT_SPACE_ID ? '' : `${spaceId}:`;

    // query ES directory to ensure namespace was or wasn't specified
    const { _source } = await es.get({
      id: `${expectedSpacePrefix}${spaceAwareType}:${resp.body.id}`,
      index: '.kibana',
    });

    const { namespace: actualNamespace } = _source;

    if (spaceId === DEFAULT_SPACE_ID) {
      expect(actualNamespace).to.eql(undefined);
    } else {
      expect(actualNamespace).to.eql(spaceId);
    }
  };

  const expectNotSpaceAwareRbacForbidden = createExpectRbacForbidden(notSpaceAwareType);

  const expectNotSpaceAwareResults = async (resp: { [key: string]: any }) => {
    expect(resp.body)
      .to.have.property('id')
      .match(/^[0-9a-f-]{36}$/);

    // loose ISO8601 UTC time with milliseconds validation
    expect(resp.body)
      .to.have.property('updated_at')
      .match(/^[\d-]{10}T[\d:\.]{12}Z$/);

    expect(resp.body).to.eql({
      id: resp.body.id,
      type: notSpaceAwareType,
      updated_at: resp.body.updated_at,
      version: resp.body.version,
      attributes: {
        name: `Can't be contained to a space`,
      },
      references: [],
    });

    // query ES directory to ensure namespace wasn't specified
    const { _source } = await es.get({
      id: `${notSpaceAwareType}:${resp.body.id}`,
      index: '.kibana',
    });

    const { namespace: actualNamespace } = _source;

    expect(actualNamespace).to.eql(undefined);
  };

  const expectSpaceAwareRbacForbidden = createExpectRbacForbidden(spaceAwareType);

  const expectHiddenTypeRbacForbidden = createExpectRbacForbidden('hiddentype');

  const makeCreateTest = (describeFn: DescribeFn) => (
    description: string,
    definition: CreateTestDefinition
  ) => {
    const { user = {}, spaceId = DEFAULT_SPACE_ID, tests } = definition;
    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));
      it(`should return ${tests.spaceAware.statusCode} for a space-aware type`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/${spaceAwareType}`)
          .auth(user.username, user.password)
          .send({
            attributes: {
              title: 'My favorite vis',
            },
          })
          .expect(tests.spaceAware.statusCode)
          .then(tests.spaceAware.response);
      });

      it(`should return ${tests.notSpaceAware.statusCode} for a non space-aware type`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/${notSpaceAwareType}`)
          .auth(user.username, user.password)
          .send({
            attributes: {
              name: `Can't be contained to a space`,
            },
          })
          .expect(tests.notSpaceAware.statusCode)
          .then(tests.notSpaceAware.response);
      });

      it(`should return ${tests.hiddenType.statusCode} for the hiddentype`, async () => {
        await supertest
          .post(`${getUrlPrefix(spaceId)}/api/saved_objects/hiddentype`)
          .auth(user.username, user.password)
          .send({
            attributes: {
              name: `Can't be created via the Saved Objects API`,
            },
          })
          .expect(tests.hiddenType.statusCode)
          .then(tests.hiddenType.response);
      });

      if (tests.custom) {
        it(tests.custom.description, async () => {
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/saved_objects/${tests.custom!.type}`)
            .auth(user.username, user.password)
            .send(tests.custom!.requestBody)
            .expect(tests.custom!.statusCode)
            .then(tests.custom!.response);
        });
      }
    });
  };

  const createTest = makeCreateTest(describe);
  // @ts-ignore
  createTest.only = makeCreateTest(describe.only);

  return {
    createExpectSpaceAwareResults,
    createTest,
    expectNotSpaceAwareRbacForbidden,
    expectNotSpaceAwareResults,
    expectSpaceAwareRbacForbidden,
    expectBadRequestForHiddenType,
    expectHiddenTypeRbacForbidden,
  };
}

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

interface SelectTest {
  statusCode: number;
  response: (resp: { [key: string]: any }) => void;
}

interface SelectTests {
  default: SelectTest;
}

interface SelectTestDefinition {
  user?: TestDefinitionAuthentication;
  currentSpaceId: string;
  selectSpaceId: string;
  tests: SelectTests;
}

const nonExistantSpaceId = 'not-a-space';

export function selectTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const createExpectEmptyResult = () => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql('');
  };

  const createExpectNotFoundResult = () => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      error: 'Not Found',
      message: 'Not Found',
      statusCode: 404,
    });
  };

  const createExpectRbacForbidden = (spaceId: any) => (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unauthorized to get ${spaceId} space`,
    });
  };

  const createExpectResults = (spaceId: string) => (resp: { [key: string]: any }) => {
    const allSpaces = [
      {
        id: 'default',
        name: 'Default Space',
        description: 'This is the default space',
        disabledFeatures: [],
        _reserved: true,
      },
      {
        id: 'space_1',
        name: 'Space 1',
        description: 'This is the first test space',
        disabledFeatures: [],
      },
      {
        id: 'space_2',
        name: 'Space 2',
        description: 'This is the second test space',
        disabledFeatures: [],
      },
    ];
    expect(resp.body).to.eql(allSpaces.find(space => space.id === spaceId));
  };

  const createExpectSpaceResponse = (spaceId: string) => (resp: { [key: string]: any }) => {
    if (spaceId === DEFAULT_SPACE_ID) {
      expectDefaultSpaceResponse(resp);
    } else {
      expect(resp.body).to.eql({
        location: `/s/${spaceId}/app/kibana`,
      });
    }
  };

  const expectDefaultSpaceResponse = (resp: { [key: string]: any }) => {
    expect(resp.body).to.eql({
      location: `/app/kibana`,
    });
  };

  const makeSelectTest = (describeFn: DescribeFn) => (
    description: string,
    { user = {}, currentSpaceId, selectSpaceId, tests }: SelectTestDefinition
  ) => {
    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.default.statusCode}`, async () => {
        return supertest
          .post(`${getUrlPrefix(currentSpaceId)}/api/spaces/v1/space/${selectSpaceId}/select`)
          .auth(user.username, user.password)
          .expect(tests.default.statusCode)
          .then(tests.default.response);
      });
    });
  };

  const selectTest = makeSelectTest(describe);
  // @ts-ignore
  selectTest.only = makeSelectTest(describe.only);

  return {
    createExpectEmptyResult,
    createExpectNotFoundResult,
    createExpectRbacForbidden,
    createExpectResults,
    createExpectSpaceResponse,
    expectDefaultSpaceResponse,
    nonExistantSpaceId,
    selectTest,
  };
}

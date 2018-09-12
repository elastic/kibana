/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SuperTest } from 'supertest';
import { DEFAULT_SPACE_ID } from '../../../../plugins/spaces/common/constants';
import { getUrlPrefix } from '../lib/space_test_utils';
import { DescribeFn, TestDefinitionAuthentication } from '../lib/types';

interface SelectTest {
  statusCode: number;
  response: (resp: any) => void;
}

interface SelectTests {
  default: SelectTest;
}

interface SelectTestDefinition {
  auth?: TestDefinitionAuthentication;
  currentSpaceId: string;
  spaceId: string;
  tests: SelectTests;
}

export function selectTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const nonExistantSpaceId = 'not-a-space';

  const makeSelectTest = (describeFn: DescribeFn) => (
    description: string,
    { auth = {}, currentSpaceId, spaceId, tests }: SelectTestDefinition
  ) => {
    describeFn(description, () => {
      beforeEach(() => esArchiver.load('saved_objects/spaces'));
      afterEach(() => esArchiver.unload('saved_objects/spaces'));

      it(`should return ${tests.default.statusCode}`, async () => {
        return supertest
          .post(`${getUrlPrefix(currentSpaceId)}/api/spaces/v1/space/${spaceId}/select`)
          .auth(auth.username, auth.password)
          .expect(tests.default.statusCode)
          .then(tests.default.response);
      });
    });
  };

  const selectTest = makeSelectTest(describe);
  // @ts-ignore
  selectTest.only = makeSelectTest(describe.only);

  const createExpectResults = (spaceId: string) => (resp: any) => {
    const allSpaces = [
      {
        id: 'default',
        name: 'Default Space',
        description: 'This is the default space',
        _reserved: true,
      },
      {
        id: 'space_1',
        name: 'Space 1',
        description: 'This is the first test space',
      },
      {
        id: 'space_2',
        name: 'Space 2',
        description: 'This is the second test space',
      },
    ];
    expect(resp.body).to.eql(allSpaces.find(space => space.id === spaceId));
  };

  const createExpectEmptyResult = () => (resp: any) => {
    expect(resp.body).to.eql('');
  };

  const createExpectNotFoundResult = () => (resp: any) => {
    expect(resp.body).to.eql({
      error: 'Not Found',
      statusCode: 404,
    });
  };
  const createExpectRbacForbidden = (spaceId: any) => (resp: any) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Unauthorized to get ${spaceId} space`,
    });
  };

  const expectDefaultSpaceResponse = (resp: any) => {
    expect(resp.body).to.eql({
      location: `/app/kibana`,
    });
  };

  const createExpectSpaceResponse = (spaceId: string) => (resp: any) => {
    if (spaceId === DEFAULT_SPACE_ID) {
      expectDefaultSpaceResponse(resp);
    } else {
      expect(resp.body).to.eql({
        location: `/s/${spaceId}/app/kibana`,
      });
    }
  };

  const createExpectLegacyForbidden = (username: string) => (resp: any) => {
    expect(resp.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `action [indices:data/read/get] is unauthorized for user [${username}]: [security_exception] action [indices:data/read/get] is unauthorized for user [${username}]`,
    });
  };

  return {
    selectTest,
    nonExistantSpaceId,
    expectDefaultSpaceResponse,
    createExpectSpaceResponse,
    createExpectResults,
    createExpectRbacForbidden,
    createExpectEmptyResult,
    createExpectNotFoundResult,
    createExpectLegacyForbidden,
  };
}

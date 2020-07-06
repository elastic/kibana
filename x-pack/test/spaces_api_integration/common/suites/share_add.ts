/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SuperTest } from 'supertest';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { SPACES } from '../lib/spaces';
import {
  expectResponses,
  getUrlPrefix,
} from '../../../saved_object_api_integration/common/lib/saved_object_test_utils';
import {
  ExpectResponseBody,
  TestDefinition,
  TestSuite,
} from '../../../saved_object_api_integration/common/lib/types';

export interface ShareAddTestDefinition extends TestDefinition {
  request: { spaces: string[]; object: { type: string; id: string } };
}
export type ShareAddTestSuite = TestSuite<ShareAddTestDefinition>;
export interface ShareAddTestCase {
  id: string;
  namespaces: string[];
  failure?: 400 | 403 | 404;
  fail400Param?: string;
  fail403Param?: string;
}

const TYPE = 'sharedtype';
const createRequest = ({ id, namespaces }: ShareAddTestCase) => ({
  spaces: namespaces,
  object: { type: TYPE, id },
});
const getTestTitle = ({ id, namespaces }: ShareAddTestCase) =>
  `{id: ${id}, namespaces: [${namespaces.join(',')}]}`;

export function shareAddTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectResponseBody = (testCase: ShareAddTestCase): ExpectResponseBody => async (
    response: Record<string, any>
  ) => {
    const { id, failure, fail400Param, fail403Param } = testCase;
    const object = response.body;
    if (failure === 403) {
      await expectResponses.forbidden(fail403Param!)(TYPE)(response);
    } else if (failure) {
      let error: any;
      if (failure === 400) {
        error = SavedObjectsErrorHelpers.createBadRequestError(
          `${id} already exists in the following namespace(s): ${fail400Param}`
        );
      } else if (failure === 404) {
        error = SavedObjectsErrorHelpers.createGenericNotFoundError(TYPE, id);
      }
      expect(object.error).to.eql(error.output.payload.error);
      expect(object.statusCode).to.eql(error.output.payload.statusCode);
    } else {
      // success
      expect(object).to.eql({});
    }
  };
  const createTestDefinitions = (
    testCases: ShareAddTestCase | ShareAddTestCase[],
    forbidden: boolean,
    options?: {
      responseBodyOverride?: ExpectResponseBody;
      fail403Param?: string;
    }
  ): ShareAddTestDefinition[] => {
    let cases = Array.isArray(testCases) ? testCases : [testCases];
    if (forbidden) {
      // override the expected result in each test case
      cases = cases.map((x) => ({ ...x, failure: 403, fail403Param: options?.fail403Param }));
    }
    return cases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode: x.failure ?? 204,
      request: createRequest(x),
      responseBody: options?.responseBodyOverride || expectResponseBody(x),
    }));
  };

  const makeShareAddTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: ShareAddTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const requestBody = test.request;
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/spaces/_share_saved_object_add`)
            .auth(user?.username, user?.password)
            .send(requestBody)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeShareAddTest(describe);
  // @ts-ignore
  addTests.only = makeShareAddTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}

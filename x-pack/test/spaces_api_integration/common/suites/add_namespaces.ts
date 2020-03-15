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
  getTestTitle,
} from '../../../saved_object_api_integration/common/lib/space_test_utils';
import {
  DescribeFn,
  ExpectResponseBody,
  TestDefinition,
  TestSuite,
} from '../../../saved_object_api_integration/common/lib/types';

export interface AddNamespacesTestDefinition extends TestDefinition {
  request: { spaces: string[]; object: { type: string; id: string } };
}
export type AddNamespacesTestSuite = TestSuite<AddNamespacesTestDefinition>;
export interface AddNamespacesTestCase {
  id: string;
  namespaces: string[];
  failure?: 400 | 403 | 404;
  fail400Param?: string;
  fail403Param?: string;
}

const TYPE = 'sharedtype';
export const createRequest = ({ id, namespaces }: AddNamespacesTestCase) => ({
  spaces: namespaces,
  object: { type: TYPE, id },
});

export function addNamespacesTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectResponseBody = (testCase: AddNamespacesTestCase): ExpectResponseBody => async (
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
    testCases: AddNamespacesTestCase | AddNamespacesTestCase[],
    forbidden: boolean,
    options?: {
      responseBodyOverride?: ExpectResponseBody;
      fail403Param?: string;
    }
  ): AddNamespacesTestDefinition[] => {
    let cases = Array.isArray(testCases) ? testCases : [testCases];
    if (forbidden) {
      // override the expected result in each test case
      cases = cases.map(x => ({ ...x, failure: 403, fail403Param: options?.fail403Param }));
    }
    return cases.map(x => ({
      title: getTestTitle({ ...x, type: TYPE }),
      responseStatusCode: x.failure ?? 204,
      request: createRequest(x),
      responseBody: options?.responseBodyOverride || expectResponseBody(x),
    }));
  };

  const makeAddNamespacesTest = (describeFn: DescribeFn) => (
    description: string,
    definition: AddNamespacesTestSuite
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

  const addTests = makeAddNamespacesTest(describe);
  // @ts-ignore
  addTests.only = makeAddNamespacesTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}

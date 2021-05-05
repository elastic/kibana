/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { without, uniq } from 'lodash';
import { SuperTest } from 'supertest';
import {
  SavedObjectsErrorHelpers,
  SavedObjectsUpdateObjectsSpacesResponse,
} from '../../../../../src/core/server';
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

export interface UpdateObjectsSpacesTestDefinition extends TestDefinition {
  request: {
    objects: Array<{ type: string; id: string }>;
    spacesToAdd: string[];
    spacesToRemove: string[];
  };
}
export type UpdateObjectsSpacesTestSuite = TestSuite<UpdateObjectsSpacesTestDefinition>;
export interface UpdateObjectsSpacesTestCase {
  objects: Array<{
    id: string;
    existingNamespaces: string[];
    failure?: 400 | 404;
  }>;
  spacesToAdd: string[];
  spacesToRemove: string[];
}

const TYPE = 'sharedtype';
const createRequest = ({ objects, spacesToAdd, spacesToRemove }: UpdateObjectsSpacesTestCase) => ({
  objects: objects.map(({ id }) => ({ type: TYPE, id })),
  spacesToAdd,
  spacesToRemove,
});
const getTestTitle = ({ objects, spacesToAdd, spacesToRemove }: UpdateObjectsSpacesTestCase) => {
  const objStr = objects.map(({ id }) => id).join(',');
  const addStr = spacesToAdd.join(',');
  const remStr = spacesToRemove.join(',');
  return `{objects: [${objStr}], spacesToAdd: [${addStr}], spacesToRemove: [${remStr}]}`;
};

export function updateObjectsSpacesTestSuiteFactory(esArchiver: any, supertest: SuperTest<any>) {
  const expectForbidden = expectResponses.forbiddenTypes('share_to_space');
  const expectResponseBody = (
    testCase: UpdateObjectsSpacesTestCase,
    statusCode: 200 | 403,
    authorizedSpace?: string
  ): ExpectResponseBody => async (response: Record<string, any>) => {
    if (statusCode === 403) {
      await expectForbidden(TYPE)(response);
    } else {
      const { objects, spacesToAdd, spacesToRemove } = testCase;
      const apiResponse = response.body as SavedObjectsUpdateObjectsSpacesResponse;
      objects.forEach(({ id, existingNamespaces, failure }, i) => {
        const object = apiResponse.objects[i];
        if (failure === 404) {
          const error = SavedObjectsErrorHelpers.createGenericNotFoundError(TYPE, id);
          expect(object.error).to.eql(error.output.payload);
        } else {
          // success
          const expectedSpaces = without(
            uniq([...existingNamespaces, ...spacesToAdd]),
            ...spacesToRemove
          ).map((x) => (authorizedSpace && x !== authorizedSpace && x !== '*' ? '?' : x));

          const result = apiResponse.objects[i];
          expect(result.type).to.eql(TYPE);
          expect(result.id).to.eql(id);
          expect(result.spaces.sort()).to.eql(expectedSpaces.sort());
        }
      });
    }
  };
  const createTestDefinitions = (
    testCases: UpdateObjectsSpacesTestCase | UpdateObjectsSpacesTestCase[],
    forbidden: boolean,
    options: {
      /** If defined, will expect results to have redacted any spaces that do not match this one. */
      authorizedSpace?: string;
      responseBodyOverride?: ExpectResponseBody;
    } = {}
  ): UpdateObjectsSpacesTestDefinition[] => {
    const cases = Array.isArray(testCases) ? testCases : [testCases];
    const responseStatusCode = forbidden ? 403 : 200;
    return cases.map((x) => ({
      title: getTestTitle(x),
      responseStatusCode,
      request: createRequest(x),
      responseBody:
        options?.responseBodyOverride ||
        expectResponseBody(x, responseStatusCode, options.authorizedSpace),
    }));
  };

  const makeUpdateObjectsSpacesTest = (describeFn: Mocha.SuiteFunction) => (
    description: string,
    definition: UpdateObjectsSpacesTestSuite
  ) => {
    const { user, spaceId = SPACES.DEFAULT.spaceId, tests } = definition;

    describeFn(description, () => {
      before(() => esArchiver.load('saved_objects/spaces'));
      after(() => esArchiver.unload('saved_objects/spaces'));

      for (const test of tests) {
        it(`should return ${test.responseStatusCode} ${test.title}`, async () => {
          const requestBody = test.request;
          await supertest
            .post(`${getUrlPrefix(spaceId)}/api/spaces/_update_objects_spaces`)
            .auth(user?.username, user?.password)
            .send(requestBody)
            .expect(test.responseStatusCode)
            .then(test.responseBody);
        });
      }
    });
  };

  const addTests = makeUpdateObjectsSpacesTest(describe);
  // @ts-ignore
  addTests.only = makeUpdateObjectsSpacesTest(describe.only);

  return {
    addTests,
    createTestDefinitions,
  };
}

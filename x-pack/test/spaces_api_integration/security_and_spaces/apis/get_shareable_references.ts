/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTestScenarios } from '../../../saved_object_api_integration/common/lib/saved_object_test_utils';
import type { TestUser } from '../../../saved_object_api_integration/common/lib/types';
import type { FtrProviderContext } from '../../common/ftr_provider_context';
import { SPACES } from '../../common/lib/spaces';
import type {
  GetShareableReferencesTestCase,
  GetShareableReferencesTestDefinition,
} from '../../common/suites/get_shareable_references';
import {
  EXPECTED_RESULTS,
  getShareableReferencesTestSuiteFactory,
  TEST_CASE_OBJECTS,
} from '../../common/suites/get_shareable_references';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;

const createTestCases = (spaceId: string): GetShareableReferencesTestCase[] => {
  const objects = [
    // requested objects are the same for each space
    TEST_CASE_OBJECTS.SHAREABLE_TYPE,
    TEST_CASE_OBJECTS.SHAREABLE_TYPE_DOES_NOT_EXIST,
    TEST_CASE_OBJECTS.NON_SHAREABLE_TYPE,
  ];

  if (spaceId === DEFAULT_SPACE_ID) {
    return [{ objects, expectedResults: EXPECTED_RESULTS.IN_DEFAULT_SPACE }];
  } else if (spaceId === SPACE_1_ID) {
    return [{ objects, expectedResults: EXPECTED_RESULTS.IN_SPACE_1 }];
  } else if (spaceId === SPACE_2_ID) {
    return [{ objects, expectedResults: EXPECTED_RESULTS.IN_SPACE_2 }];
  }
  throw new Error(`Unexpected test case for space '${spaceId}'!`);
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions } = getShareableReferencesTestSuiteFactory(
    esArchiver,
    supertest
  );
  const createTests = (spaceId: string) => {
    const testCases = createTestCases(spaceId);
    return {
      unauthorized: createTestDefinitions(testCases, true),
      authorizedThisSpace: createTestDefinitions(testCases, false, { authorizedSpace: spaceId }),
      authorizedGlobally: createTestDefinitions(testCases, false),
    };
  };

  describe('_get_shareable_references', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` targeting the ${spaceId} space`;
      const { unauthorized, authorizedThisSpace, authorizedGlobally } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: GetShareableReferencesTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [
        users.noAccess,
        users.legacyAll,
        users.dualRead,
        users.readGlobally,
        users.readAtSpace,
        users.allAtOtherSpace,
      ].forEach((user) => {
        _addTests(user, unauthorized);
      });
      _addTests(users.allAtSpace, authorizedThisSpace);
      [users.dualAll, users.allGlobally, users.superuser].forEach((user) => {
        _addTests(user, authorizedGlobally);
      });
    });
  });
}

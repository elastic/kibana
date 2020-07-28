/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SPACES } from '../../common/lib/spaces';
import { testCaseFailures, getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  importTestSuiteFactory,
  TEST_CASES as CASES,
  ImportTestDefinition,
} from '../../common/suites/import';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;

const createTestCases = (spaceId: string) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const importableTypes = [
    { ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE, ...fail409(spaceId === DEFAULT_SPACE_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail409(spaceId === SPACE_1_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail409(spaceId === SPACE_2_ID) },
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409() },
    CASES.NEW_SINGLE_NAMESPACE_OBJ,
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
  ];
  const nonImportableTypes = [
    { ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1, ...fail400() },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1, ...fail400() },
    { ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2, ...fail400() },
    { ...CASES.HIDDEN, ...fail400() },
    { ...CASES.NEW_MULTI_NAMESPACE_OBJ, ...fail400() },
  ];
  const allTypes = importableTypes.concat(nonImportableTypes);
  return { importableTypes, nonImportableTypes, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions, expectForbidden } = importTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );
  const createTests = (spaceId: string) => {
    const { importableTypes, nonImportableTypes, allTypes } = createTestCases(spaceId);
    // use singleRequest to reduce execution time and/or test combined cases
    return {
      unauthorized: [
        createTestDefinitions(importableTypes, true, { spaceId }),
        createTestDefinitions(nonImportableTypes, false, { spaceId, singleRequest: true }),
        createTestDefinitions(allTypes, true, {
          spaceId,
          singleRequest: true,
          responseBodyOverride: expectForbidden(['dashboard', 'globaltype', 'isolatedtype']),
        }),
      ].flat(),
      authorized: createTestDefinitions(allTypes, false, { spaceId, singleRequest: true }),
    };
  };

  describe('_import', () => {
    getTestScenarios().securityAndSpaces.forEach(({ spaceId, users }) => {
      const suffix = ` within the ${spaceId} space`;
      const { unauthorized, authorized } = createTests(spaceId);
      const _addTests = (user: TestUser, tests: ImportTestDefinition[]) => {
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
      [users.dualAll, users.allGlobally, users.allAtSpace, users.superuser].forEach((user) => {
        _addTests(user, authorized);
      });
    });
  });
}

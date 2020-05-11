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
  bulkCreateTestSuiteFactory,
  TEST_CASES as CASES,
  BulkCreateTestDefinition,
} from '../../common/suites/bulk_create';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { fail400, fail409 } = testCaseFailures;
const unresolvableConflict = (condition?: boolean) =>
  condition !== false ? { fail409Param: 'unresolvableConflict' } : {};

const createTestCases = (overwrite: boolean, spaceId: string) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const normalTypes = [
    {
      ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
      ...fail409(!overwrite && spaceId === DEFAULT_SPACE_ID),
    },
    { ...CASES.SINGLE_NAMESPACE_SPACE_1, ...fail409(!overwrite && spaceId === SPACE_1_ID) },
    { ...CASES.SINGLE_NAMESPACE_SPACE_2, ...fail409(!overwrite && spaceId === SPACE_2_ID) },
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      ...fail409(!overwrite || (spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID)),
      ...unresolvableConflict(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
      ...fail409(!overwrite || spaceId !== SPACE_1_ID),
      ...unresolvableConflict(spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
      ...fail409(!overwrite || spaceId !== SPACE_2_ID),
      ...unresolvableConflict(spaceId !== SPACE_2_ID),
    },
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
    CASES.NEW_SINGLE_NAMESPACE_OBJ,
    CASES.NEW_MULTI_NAMESPACE_OBJ,
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
  ];
  const hiddenType = [{ ...CASES.HIDDEN, ...fail400() }];
  const allTypes = normalTypes.concat(hiddenType);
  return { normalTypes, hiddenType, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('legacyEs');

  const { addTests, createTestDefinitions, expectForbidden } = bulkCreateTestSuiteFactory(
    es,
    esArchiver,
    supertest
  );
  const createTests = (overwrite: boolean, spaceId: string) => {
    const { normalTypes, hiddenType, allTypes } = createTestCases(overwrite, spaceId);
    // use singleRequest to reduce execution time and/or test combined cases
    return {
      unauthorized: createTestDefinitions(allTypes, true, overwrite, { spaceId }),
      authorized: [
        createTestDefinitions(normalTypes, false, overwrite, { spaceId, singleRequest: true }),
        createTestDefinitions(hiddenType, true, overwrite, { spaceId }),
        createTestDefinitions(allTypes, true, overwrite, {
          spaceId,
          singleRequest: true,
          responseBodyOverride: expectForbidden(['hiddentype']),
        }),
      ].flat(),
      superuser: createTestDefinitions(allTypes, false, overwrite, {
        spaceId,
        singleRequest: true,
      }),
    };
  };

  describe('_bulk_create', () => {
    getTestScenarios([false, true]).securityAndSpaces.forEach(
      ({ spaceId, users, modifier: overwrite }) => {
        const suffix = ` within the ${spaceId} space${overwrite ? ' with overwrite enabled' : ''}`;
        const { unauthorized, authorized, superuser } = createTests(overwrite!, spaceId);
        const _addTests = (user: TestUser, tests: BulkCreateTestDefinition[]) => {
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
        [users.dualAll, users.allGlobally, users.allAtSpace].forEach((user) => {
          _addTests(user, authorized);
        });
        _addTests(users.superuser, superuser);
      }
    );
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES, ALL_SPACES_ID } from '../../common/lib/spaces';
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
  const expectedNamespaces = [spaceId]; // newly created objects should have this `namespaces` array in their return value
  const normalTypes = [
    {
      ...CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
      ...fail409(!overwrite && spaceId === DEFAULT_SPACE_ID),
      expectedNamespaces,
    },
    {
      ...CASES.SINGLE_NAMESPACE_SPACE_1,
      ...fail409(!overwrite && spaceId === SPACE_1_ID),
      expectedNamespaces,
    },
    {
      ...CASES.SINGLE_NAMESPACE_SPACE_2,
      ...fail409(!overwrite && spaceId === SPACE_2_ID),
      expectedNamespaces,
    },
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, ...fail409(!overwrite) },
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
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
      ...fail409(!overwrite || spaceId !== DEFAULT_SPACE_ID),
      ...unresolvableConflict(spaceId !== DEFAULT_SPACE_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1,
      ...fail409(!overwrite || spaceId !== SPACE_1_ID),
      ...unresolvableConflict(spaceId !== SPACE_1_ID),
    },
    { ...CASES.NAMESPACE_AGNOSTIC, ...fail409(!overwrite) },
    { ...CASES.NEW_SINGLE_NAMESPACE_OBJ, expectedNamespaces },
    { ...CASES.NEW_MULTI_NAMESPACE_OBJ, expectedNamespaces },
    CASES.NEW_NAMESPACE_AGNOSTIC_OBJ,
    // We test the alias conflict preflight check error case twice; once by checking the alias with "bulk_get" (here) and once by using "find" (below).
    {
      ...CASES.ALIAS_CONFLICT_OBJ,
      // first try fails if this is the default space or space_1, because an alias exists in those spaces
      ...(spaceId === DEFAULT_SPACE_ID
        ? { ...fail409(), fail409Param: 'aliasConflictDefaultSpace' }
        : {}),
      ...(spaceId === SPACE_1_ID ? { ...fail409(), fail409Param: 'aliasConflictSpace1' } : {}),
      expectedNamespaces,
    },
  ];
  const crossNamespace = [
    {
      ...CASES.ALIAS_CONFLICT_OBJ,
      initialNamespaces: ['*'],
      ...fail409(),
      fail409Param: 'aliasConflictAllSpaces', // second try fails because an alias exists in space_x, the default space, and space_1 (but not space_y because that alias is disabled)
      // note that if an object was successfully created with this type/ID in the first try, that won't change this outcome, because an alias conflict supersedes all other types of conflicts
    },
    {
      ...CASES.INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE,
      initialNamespaces: ['x', 'y'],
      ...fail400(), // cannot be created in multiple spaces
    },
    CASES.INITIAL_NS_SINGLE_NAMESPACE_OBJ_OTHER_SPACE, // second try creates it in a single other space, which is valid
    {
      ...CASES.INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE,
      initialNamespaces: [ALL_SPACES_ID],
      ...fail400(), // cannot be created in multiple spaces
    },
    CASES.INITIAL_NS_MULTI_NAMESPACE_ISOLATED_OBJ_OTHER_SPACE, // second try creates it in a single other space, which is valid
    CASES.INITIAL_NS_MULTI_NAMESPACE_OBJ_EACH_SPACE,
    CASES.INITIAL_NS_MULTI_NAMESPACE_OBJ_ALL_SPACES,
  ];
  const hiddenType = [{ ...CASES.HIDDEN, ...fail400() }];
  const allTypes = [...normalTypes, ...crossNamespace, ...hiddenType];
  return { normalTypes, crossNamespace, hiddenType, allTypes };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  const { addTests, createTestDefinitions, expectSavedObjectForbidden } =
    bulkCreateTestSuiteFactory(esArchiver, supertest);
  const createTests = (overwrite: boolean, spaceId: string, user: TestUser) => {
    const { normalTypes, crossNamespace, hiddenType, allTypes } = createTestCases(
      overwrite,
      spaceId
    );
    // use singleRequest to reduce execution time and/or test combined cases
    const authorizedCommon = [
      createTestDefinitions(normalTypes, false, overwrite, {
        spaceId,
        user,
        singleRequest: true,
      }),
      createTestDefinitions(hiddenType, true, overwrite, { spaceId, user }),
    ].flat();
    return {
      unauthorized: createTestDefinitions(allTypes, true, overwrite, { spaceId, user }),
      authorizedAtSpace: [
        authorizedCommon,
        createTestDefinitions(crossNamespace, true, overwrite, { spaceId, user }),
        createTestDefinitions(allTypes, true, overwrite, {
          spaceId,
          user,
          singleRequest: true,
        }),
      ].flat(),
      authorizedEverywhere: [
        authorizedCommon,
        createTestDefinitions(crossNamespace, false, overwrite, {
          spaceId,
          user,
          singleRequest: true,
        }),
        createTestDefinitions(allTypes, true, overwrite, {
          spaceId,
          user,
          singleRequest: true,
          responseBodyOverride: expectSavedObjectForbidden(['hiddentype']),
        }),
      ].flat(),
      superuser: createTestDefinitions(allTypes, false, overwrite, {
        spaceId,
        user,
        singleRequest: true,
      }),
    };
  };

  describe('_bulk_create', () => {
    getTestScenarios([false, true]).securityAndSpaces.forEach(
      ({ spaceId, users, modifier: overwrite }) => {
        const suffix = ` within the ${spaceId} space${overwrite ? ' with overwrite enabled' : ''}`;
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
          const { unauthorized } = createTests(overwrite!, spaceId, user);
          _addTests(user, unauthorized);
        });

        const { authorizedAtSpace } = createTests(overwrite!, spaceId, users.allAtSpace);
        _addTests(users.allAtSpace, authorizedAtSpace);

        [users.dualAll, users.allGlobally].forEach((user) => {
          const { authorizedEverywhere } = createTests(overwrite!, spaceId, user);
          _addTests(user, authorizedEverywhere);
        });

        const { superuser } = createTests(overwrite!, spaceId, users.superuser);
        _addTests(users.superuser, superuser);
      }
    );
  });
}

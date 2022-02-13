/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { SPACES } from '../../common/lib/spaces';
import { getTestScenarios } from '../../common/lib/saved_object_test_utils';
import { TestUser } from '../../common/lib/types';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  resolveImportErrorsTestSuiteFactory,
  resolveImportErrorsTestCaseFailures,
  TEST_CASES as CASES,
  SPECIAL_TEST_CASES,
  ResolveImportErrorsTestDefinition,
} from '../../common/suites/resolve_import_errors';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const { failUnsupportedType, failConflict } = resolveImportErrorsTestCaseFailures;
const destinationId = (condition?: boolean) =>
  condition !== false ? { successParam: 'destinationId' } : {};
const newCopy = () => ({ successParam: 'createNewCopy' });

const createNewCopiesTestCases = () => {
  // for each outcome, if failure !== undefined then we expect to receive
  // an error; otherwise, we expect to receive a success result
  const importable = Object.values(CASES).map((testCase) => {
    const newId = uuidv4();
    return {
      ...testCase,
      successParam: 'createNewCopies',
      destinationId: newId,
      expectedNewId: newId,
    };
  });
  const nonImportable = [{ ...SPECIAL_TEST_CASES.HIDDEN, ...failUnsupportedType() }]; // unsupported_type is an "unresolvable" error
  const all = [...importable, ...nonImportable];
  return { importable, nonImportable, all };
};

const createTestCases = (overwrite: boolean, spaceId: string) => {
  // for each permitted (non-403) outcome, if failure !== undefined then we expect
  // to receive an error; otherwise, we expect to receive a success result
  const singleNamespaceObject =
    spaceId === DEFAULT_SPACE_ID
      ? CASES.SINGLE_NAMESPACE_DEFAULT_SPACE
      : spaceId === SPACE_1_ID
      ? CASES.SINGLE_NAMESPACE_SPACE_1
      : CASES.SINGLE_NAMESPACE_SPACE_2;
  const group1Importable = [
    { ...singleNamespaceObject, ...failConflict(!overwrite) },
    { ...CASES.NAMESPACE_AGNOSTIC, ...failConflict(!overwrite) },
  ];
  const group1NonImportable = [{ ...SPECIAL_TEST_CASES.HIDDEN, ...failUnsupportedType() }];
  const group1All = [...group1Importable, ...group1NonImportable];
  const group2 = [
    { ...CASES.MULTI_NAMESPACE_ALL_SPACES, ...failConflict(!overwrite) },
    {
      ...CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
      ...failConflict(!overwrite && (spaceId === DEFAULT_SPACE_ID || spaceId === SPACE_1_ID)),
      ...destinationId(spaceId !== DEFAULT_SPACE_ID && spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
      ...failConflict(!overwrite && spaceId === SPACE_1_ID),
      ...destinationId(spaceId !== SPACE_1_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
      ...failConflict(!overwrite && spaceId === SPACE_2_ID),
      ...destinationId(spaceId !== SPACE_2_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE,
      ...failConflict(!overwrite && spaceId === DEFAULT_SPACE_ID),
      ...destinationId(spaceId !== DEFAULT_SPACE_ID),
    },
    {
      ...CASES.MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1,
      ...failConflict(!overwrite && spaceId === SPACE_1_ID),
      ...destinationId(spaceId !== SPACE_1_ID),
    },
    { ...CASES.CONFLICT_1A_OBJ, ...newCopy() }, // "ambiguous source" conflict which results in a new destination ID and empty origin ID
    { ...CASES.CONFLICT_1B_OBJ, ...newCopy() }, // "ambiguous source" conflict which results in a new destination ID and empty origin ID
    // all of the cases below represent imports that had an inexact match conflict or an ambiguous conflict
    // if we call _resolve_import_errors and don't specify overwrite, each of these will result in a conflict because an object with that
    // `expectedDestinationId` already exists
    { ...CASES.CONFLICT_2C_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "ambiguous destination" conflict; if overwrite=true, will overwrite 'conflict_2a'
    { ...CASES.CONFLICT_2D_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "ambiguous destination" conflict; if overwrite=true, will overwrite 'conflict_2b'
    { ...CASES.CONFLICT_3A_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "inexact match" conflict; if overwrite=true, will overwrite 'conflict_3'
    { ...CASES.CONFLICT_4_OBJ, ...failConflict(!overwrite), ...destinationId() }, // "inexact match" conflict; if overwrite=true, will overwrite 'conflict_4a'
  ];
  const refOrigins = [
    // These are in a separate group because they will result in a different 403 error for users who are unauthorized to read
    {
      ...SPECIAL_TEST_CASES.OUTBOUND_MISSING_REFERENCE_CONFLICT_1_OBJ,
      ...failConflict(!overwrite),
    },
    {
      ...SPECIAL_TEST_CASES.OUTBOUND_MISSING_REFERENCE_CONFLICT_2_OBJ,
      ...failConflict(!overwrite),
      ...destinationId(),
    },
    { ...SPECIAL_TEST_CASES.OUTBOUND_REFERENCE_ORIGIN_MATCH_1_OBJ },
    { ...SPECIAL_TEST_CASES.OUTBOUND_REFERENCE_ORIGIN_MATCH_2_OBJ },
  ];
  return { group1Importable, group1NonImportable, group1All, group2, refOrigins };
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const { addTests, createTestDefinitions, expectSavedObjectForbidden } =
    resolveImportErrorsTestSuiteFactory(es, esArchiver, supertest);
  const createTests = (overwrite: boolean, createNewCopies: boolean, spaceId: string) => {
    // use singleRequest to reduce execution time and/or test combined cases
    const singleRequest = true;

    if (createNewCopies) {
      const { importable, nonImportable, all } = createNewCopiesTestCases();
      const unauthorizedCommonTestDefinitions = [
        createTestDefinitions(importable, true, { createNewCopies, spaceId }),
        createTestDefinitions(nonImportable, false, { createNewCopies, spaceId, singleRequest }),
        createTestDefinitions(all, true, {
          createNewCopies,
          spaceId,
          singleRequest,
          responseBodyOverride: expectSavedObjectForbidden('bulk_create', [
            'globaltype',
            'isolatedtype',
            'sharedtype',
            'sharecapabletype',
          ]),
        }),
      ];
      return {
        unauthorizedRead: unauthorizedCommonTestDefinitions.flat(),
        unauthorizedWrite: unauthorizedCommonTestDefinitions.flat(),
        authorized: createTestDefinitions(all, false, { createNewCopies, spaceId, singleRequest }),
      };
    }

    const { group1Importable, group1NonImportable, group1All, group2, refOrigins } =
      createTestCases(overwrite, spaceId);
    const unauthorizedCommonTestDefinitions = [
      createTestDefinitions(group1Importable, true, { overwrite, spaceId }),
      createTestDefinitions(group1NonImportable, false, { overwrite, spaceId, singleRequest }),
      createTestDefinitions(group1All, true, {
        overwrite,
        spaceId,
        singleRequest,
        responseBodyOverride: expectSavedObjectForbidden('bulk_create', [
          'globaltype',
          'isolatedtype',
        ]),
      }),
      createTestDefinitions(group2, true, { overwrite, spaceId, singleRequest }),
    ];
    return {
      unauthorizedRead: [
        ...unauthorizedCommonTestDefinitions,
        createTestDefinitions(refOrigins, true, {
          overwrite,
          spaceId,
          singleRequest,
          responseBodyOverride: expectSavedObjectForbidden('bulk_get', ['index-pattern']),
        }),
      ].flat(),
      unauthorizedWrite: [
        ...unauthorizedCommonTestDefinitions,
        createTestDefinitions(refOrigins, true, { overwrite, spaceId, singleRequest }),
      ].flat(),
      authorized: [
        createTestDefinitions(group1All, false, { overwrite, spaceId, singleRequest }),
        createTestDefinitions(group2, false, { overwrite, spaceId, singleRequest }),
        createTestDefinitions(refOrigins, false, { overwrite, spaceId, singleRequest }),
      ].flat(),
    };
  };

  describe('_resolve_import_errors', () => {
    getTestScenarios([
      [false, false],
      [false, true],
      [true, false],
    ]).securityAndSpaces.forEach(({ spaceId, users, modifier }) => {
      const [overwrite, createNewCopies] = modifier!;
      const suffix = ` within the ${spaceId} space${
        overwrite
          ? ' with overwrite enabled'
          : createNewCopies
          ? ' with createNewCopies enabled'
          : ''
      }`;
      const { unauthorizedRead, unauthorizedWrite, authorized } = createTests(
        overwrite,
        createNewCopies,
        spaceId
      );
      const _addTests = (user: TestUser, tests: ResolveImportErrorsTestDefinition[]) => {
        addTests(`${user.description}${suffix}`, { user, spaceId, tests });
      };

      [users.noAccess, users.legacyAll, users.allAtOtherSpace].forEach((user) => {
        _addTests(user, unauthorizedRead);
      });
      [users.dualRead, users.readGlobally, users.readAtSpace].forEach((user) => {
        _addTests(user, unauthorizedWrite);
      });
      [users.dualAll, users.allGlobally, users.allAtSpace, users.superuser].forEach((user) => {
        _addTests(user, authorized);
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES, ALL_SPACES_ID } from './spaces';
import { TestCase } from './types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const EACH_SPACE = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID];

type CommonTestCase = Omit<TestCase, 'failure'> & { originId?: string };

export const SAVED_OBJECT_TEST_CASES: Record<string, CommonTestCase> = Object.freeze({
  SINGLE_NAMESPACE_DEFAULT_SPACE: Object.freeze({
    type: 'isolatedtype',
    id: 'defaultspace-isolatedtype-id',
    expectedNamespaces: [DEFAULT_SPACE_ID],
  }),
  SINGLE_NAMESPACE_SPACE_1: Object.freeze({
    type: 'isolatedtype',
    id: 'space1-isolatedtype-id',
    expectedNamespaces: [SPACE_1_ID],
  }),
  SINGLE_NAMESPACE_SPACE_2: Object.freeze({
    type: 'isolatedtype',
    id: 'space2-isolatedtype-id',
    expectedNamespaces: [SPACE_2_ID],
  }),
  MULTI_NAMESPACE_ALL_SPACES: Object.freeze({
    type: 'sharedtype',
    id: 'all_spaces',
    expectedNamespaces: [ALL_SPACES_ID],
  }),
  MULTI_NAMESPACE_DEFAULT_AND_SPACE_1: Object.freeze({
    type: 'sharedtype',
    id: 'default_and_space_1',
    expectedNamespaces: [DEFAULT_SPACE_ID, SPACE_1_ID],
  }),
  MULTI_NAMESPACE_ONLY_SPACE_1: Object.freeze({
    type: 'sharedtype',
    id: 'only_space_1',
    expectedNamespaces: [SPACE_1_ID],
  }),
  MULTI_NAMESPACE_ONLY_SPACE_2: Object.freeze({
    type: 'sharedtype',
    id: 'only_space_2',
    expectedNamespaces: [SPACE_2_ID],
  }),
  MULTI_NAMESPACE_ISOLATED_ONLY_DEFAULT_SPACE: Object.freeze({
    type: 'sharecapabletype',
    id: 'only_default_space',
    expectedNamespaces: [DEFAULT_SPACE_ID],
  }),
  MULTI_NAMESPACE_ISOLATED_ONLY_SPACE_1: Object.freeze({
    type: 'sharecapabletype',
    id: 'only_space_1',
    expectedNamespaces: [SPACE_1_ID],
  }),
  NAMESPACE_AGNOSTIC: Object.freeze({
    type: 'globaltype',
    id: 'globaltype-id',
  }),
  HIDDEN: Object.freeze({
    type: 'hiddentype',
    id: 'any',
  }),
});

/**
 * These objects exist in the test data for all saved object test suites, but they are only used to test various conflict scenarios.
 */
export const CONFLICT_TEST_CASES: Record<string, CommonTestCase> = Object.freeze({
  CONFLICT_1_OBJ: Object.freeze({
    type: 'sharedtype',
    id: 'conflict_1',
    expectedNamespaces: EACH_SPACE,
  }),
  CONFLICT_2A_OBJ: Object.freeze({
    type: 'sharedtype',
    id: 'conflict_2a',
    originId: 'conflict_2',
    expectedNamespaces: EACH_SPACE,
  }),
  CONFLICT_2B_OBJ: Object.freeze({
    type: 'sharedtype',
    id: 'conflict_2b',
    originId: 'conflict_2',
    expectedNamespaces: EACH_SPACE,
  }),
  CONFLICT_3_OBJ: Object.freeze({
    type: 'sharedtype',
    id: 'conflict_3',
    expectedNamespaces: EACH_SPACE,
  }),
  CONFLICT_4A_OBJ: Object.freeze({
    type: 'sharedtype',
    id: 'conflict_4a',
    originId: 'conflict_4',
    expectedNamespaces: EACH_SPACE,
  }),
});

/**
 * These objects exist in the test data for all saved object test suites, but they are only used to test specific scenarios.
 */
export const OTHER_TEST_CASES: Record<string, CommonTestCase> = Object.freeze({
  OUTBOUND_MISSING_REFERENCE_CONFLICT_1_OBJ: Object.freeze({
    type: 'sharedtype',
    id: 'outbound-missing-reference-conflict-1',
    expectedNamespaces: [ALL_SPACES_ID],
  }),
  OUTBOUND_MISSING_REFERENCE_CONFLICT_2A_OBJ: Object.freeze({
    type: 'sharedtype',
    id: 'outbound-missing-reference-conflict-2a',
    originId: 'outbound-missing-reference-conflict-2',
    expectedNamespaces: [ALL_SPACES_ID],
  }),
});

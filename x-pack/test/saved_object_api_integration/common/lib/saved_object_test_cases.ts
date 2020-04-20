/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const SAVED_OBJECT_TEST_CASES = Object.freeze({
  SINGLE_NAMESPACE_DEFAULT_SPACE: Object.freeze({
    type: 'isolatedtype',
    id: 'defaultspace-isolatedtype-id',
    namespaces: ['default'],
  }),
  SINGLE_NAMESPACE_SPACE_1: Object.freeze({
    type: 'isolatedtype',
    id: 'space1-isolatedtype-id',
    namespaces: ['space_1'],
  }),
  SINGLE_NAMESPACE_SPACE_2: Object.freeze({
    type: 'isolatedtype',
    id: 'space2-isolatedtype-id',
    namespaces: ['space_2'],
  }),
  MULTI_NAMESPACE_DEFAULT_AND_SPACE_1: Object.freeze({
    type: 'sharedtype',
    id: 'default_and_space_1',
    namespaces: ['default', 'space_1'],
  }),
  MULTI_NAMESPACE_ONLY_SPACE_1: Object.freeze({
    type: 'sharedtype',
    id: 'only_space_1',
    namespaces: ['space_1'],
  }),
  MULTI_NAMESPACE_ONLY_SPACE_2: Object.freeze({
    type: 'sharedtype',
    id: 'only_space_2',
    namespaces: ['space_2'],
  }),
  NAMESPACE_AGNOSTIC: Object.freeze({
    type: 'globaltype',
    id: 'globaltype-id',
    namespaces: undefined,
  }),
  HIDDEN: Object.freeze({
    type: 'hiddentype',
    id: 'any',
    namespaces: undefined,
  }),
});

export const DEFAULT_SPACE_SAVED_OBJECT_TEST_CASES = {
  SINGLE_NAMESPACE_DEFAULT_SPACE: SAVED_OBJECT_TEST_CASES.SINGLE_NAMESPACE_DEFAULT_SPACE,
  MULTI_NAMESPACE_DEFAULT_AND_SPACE_1: SAVED_OBJECT_TEST_CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
  NAMESPACE_AGNOSTIC: SAVED_OBJECT_TEST_CASES.NAMESPACE_AGNOSTIC,
};

export const SPACE_1_SAVED_OBJECT_TEST_CASES = {
  SINGLE_NAMESPACE_SPACE_1: SAVED_OBJECT_TEST_CASES.SINGLE_NAMESPACE_SPACE_1,
  MULTI_NAMESPACE_ONLY_SPACE_1: SAVED_OBJECT_TEST_CASES.MULTI_NAMESPACE_ONLY_SPACE_1,
  MULTI_NAMESPACE_DEFAULT_AND_SPACE_1: SAVED_OBJECT_TEST_CASES.MULTI_NAMESPACE_DEFAULT_AND_SPACE_1,
  NAMESPACE_AGNOSTIC: SAVED_OBJECT_TEST_CASES.NAMESPACE_AGNOSTIC,
};

export const SPACE_2_SAVED_OBJECT_TEST_CASES = {
  SINGLE_NAMESPACE_SPACE_2: SAVED_OBJECT_TEST_CASES.SINGLE_NAMESPACE_SPACE_2,
  MULTI_NAMESPACE_ONLY_SPACE_2: SAVED_OBJECT_TEST_CASES.MULTI_NAMESPACE_ONLY_SPACE_2,
  NAMESPACE_AGNOSTIC: SAVED_OBJECT_TEST_CASES.NAMESPACE_AGNOSTIC,
};

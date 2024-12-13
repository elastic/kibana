/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IS_OPERATOR } from '../../common/types/timeline';
import type { DataProvider, DataProvidersAnd } from '../../common/types/timeline';

export const providerA: DataProvidersAnd = {
  enabled: true,
  excluded: false,
  id: 'context-field.name-a',
  kqlQuery: '',
  name: 'a',
  queryMatch: {
    field: 'field.name',
    value: 'a',
    operator: IS_OPERATOR,
  },
};

export const providerB: DataProvidersAnd = {
  enabled: true,
  excluded: false,
  id: 'context-field.name-b',
  kqlQuery: '',
  name: 'b',
  queryMatch: {
    field: 'field.name',
    value: 'b',
    operator: IS_OPERATOR,
  },
};

export const providerC: DataProvidersAnd = {
  enabled: true,
  excluded: false,
  id: 'context-field.name-c',
  kqlQuery: '',
  name: 'c',
  queryMatch: {
    field: 'field.name',
    value: 'c',
    operator: IS_OPERATOR,
  },
};

export const providerD: DataProvidersAnd = {
  enabled: true,
  excluded: false,
  id: 'context-field.name-d',
  kqlQuery: '',
  name: 'd',
  queryMatch: {
    field: 'field.name',
    value: 'd',
    operator: IS_OPERATOR,
  },
};

export const providerE: DataProvidersAnd = {
  enabled: true,
  excluded: false,
  id: 'context-field.name-e',
  kqlQuery: '',
  name: 'e',
  queryMatch: {
    field: 'field.name',
    value: 'e',
    operator: IS_OPERATOR,
  },
};

export const providerF: DataProvidersAnd = {
  enabled: true,
  excluded: false,
  id: 'context-field.name-f',
  kqlQuery: '',
  name: 'f',
  queryMatch: {
    field: 'field.name',
    value: 'f',
    operator: IS_OPERATOR,
  },
};

export const twoGroups: DataProvider[] = [
  { ...providerA, and: [providerB, providerC] },
  { ...providerD, and: [providerE, providerF] },
];

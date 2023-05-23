/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from '@kbn/test';

import { FtrProviderContext } from '../../ftr_provider_context';

const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export type MlCommonAPI = ProvidedType<typeof MachineLearningCommonAPIProvider>;

export function MachineLearningCommonAPIProvider({}: FtrProviderContext) {
  return {
    getCommonRequestHeader,
  };
}

export function getCommonRequestHeader(apiVersion?: string) {
  if (apiVersion === undefined) {
    return COMMON_REQUEST_HEADERS;
  }

  return Object.assign(COMMON_REQUEST_HEADERS, { 'elastic-api-version': apiVersion });
}

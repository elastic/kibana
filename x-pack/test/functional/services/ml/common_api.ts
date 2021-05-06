/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from '@kbn/test';

import { FtrProviderContext } from '../../ftr_provider_context';

export const COMMON_REQUEST_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export type MlCommonAPI = ProvidedType<typeof MachineLearningCommonAPIProvider>;

export function MachineLearningCommonAPIProvider({}: FtrProviderContext) {
  return {
    async getCommonRequestHeader() {
      return COMMON_REQUEST_HEADERS;
    },
  };
}

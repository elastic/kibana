/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProvidedType } from '@kbn/test/types/ftr';

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

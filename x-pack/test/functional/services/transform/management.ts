/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProvidedType } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

export type TransformManagement = ProvidedType<typeof TransformManagementProvider>;

export function TransformManagementProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertTransformListPageExists() {
      await testSubjects.existOrFail('transformPageTransformList');
    },

    async assertNoTransformsFoundMessageExists() {
      await testSubjects.existOrFail('transformNoTransformsFound');
    },

    async assertTransformsTableExists() {
      await testSubjects.existOrFail('~transformListTable');
    },

    async assertCreateNewTransformButtonExists() {
      await testSubjects.existOrFail('transformButtonCreate');
    },

    async assertTransformStatsBarExists() {
      await testSubjects.existOrFail('transformStatsBar');
    },

    async startTransformCreation() {
      if (await testSubjects.exists('transformNoTransformsFound')) {
        await testSubjects.click('transformCreateFirstButton');
      } else {
        await testSubjects.click('transformButtonCreate');
      }
      await testSubjects.existOrFail('transformSelectSourceModal');
    },
  };
}

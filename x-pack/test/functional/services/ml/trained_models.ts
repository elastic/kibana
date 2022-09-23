/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function TrainedModelsProvider({ getService }: FtrProviderContext, mlCommonUI: MlCommonUI) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async assertStats(expectedTotalCount: number) {
      await retry.tryForTime(5 * 1000, async () => {
        const actualStats = await testSubjects.getVisibleText('mlInferenceModelsStatsBar');
        expect(actualStats).to.eql(`Total trained models: ${expectedTotalCount}`);
      });
    },

    async assertTableExists() {
      await testSubjects.existOrFail('~mlModelsTable');
    },

    async assertRowsNumberPerPage(rowsNumber: 10 | 25 | 100) {
      await mlCommonUI.assertRowsNumberPerPage('mlModelsTableContainer', rowsNumber);
    },
  };
}

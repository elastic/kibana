/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlApi } from './api';
import { MlCommonUI } from './common_ui';

type ModelType = 'regression' | 'classification';

export function TrainedModelsProvider(
  { getService }: FtrProviderContext,
  mlApi: MlApi,
  mlCommonUI: MlCommonUI
) {
  const testSubjects = getService('testSubjects');

  return {
    async createdTestTrainedModels(modelType: ModelType, count: number = 10) {
      await mlApi.createdTestTrainedModels(modelType, count);
    },

    async assertStats(expectedTotalCount: number) {
      const actualStats = await testSubjects.getVisibleText('mlInferenceModelsStatsBar');
      expect(actualStats).to.eql(`Total trained models: ${expectedTotalCount}`);
    },

    async assertRowsNumberPerPage(rowsNumber: 10 | 25 | 100) {
      await mlCommonUI.assertRowsNumberPerPage('mlModelsTableContainer', rowsNumber);
    },
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlApi } from './api';
import { PutTrainedModelConfig } from '../../../../plugins/ml/common/types/trained_models';
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
      const compressedDefinition = this.getCompressedModelDefinition(modelType);

      const models = new Array(count).fill(null).map((v, i) => {
        return {
          model_id: `dfa_${modelType}_model_n_${i}`,
          body: {
            compressed_definition: compressedDefinition,
            inference_config: {
              [modelType]: {},
            },
            input: {
              field_names: ['common_field'],
            },
          } as PutTrainedModelConfig,
        };
      });

      for (const model of models) {
        await mlApi.createTrainedModel(model.model_id, model.body);
      }
    },

    getCompressedModelDefinition(modelType: ModelType) {
      return fs.readFileSync(
        path.resolve(
          __dirname,
          'resources',
          'trained_model_definitions',
          `minimum_valid_config_${modelType}.json.gz.b64`
        ),
        'utf-8'
      );
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

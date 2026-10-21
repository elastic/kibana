/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { EXPECTED_STARTUP_TRAINED_MODEL_IDS } from './constants';

const GUIDANCE =
  'Serverless must not start ML nodes or deploy trained models on startup. ' +
  'See https://github.com/elastic/kibana-team/issues/4111. Do not update the expected model list to fix this.';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');

  describe('No ML nodes or models on startup', function () {
    it('has only the expected trained models', async () => {
      const { trained_model_configs: models } = await es.ml.getTrainedModels({ size: 1000 });
      const modelIds = models.map(({ model_id: modelId }) => modelId).sort();

      expect({ modelIds, guidance: GUIDANCE }).toEqual({
        modelIds: [...EXPECTED_STARTUP_TRAINED_MODEL_IDS].sort(),
        guidance: GUIDANCE,
      });
    });

    it('has no trained model deployments', async () => {
      const { trained_model_stats: stats } = await es.ml.getTrainedModelsStats({ size: 1000 });
      const deployed = stats
        .filter(({ deployment_stats: deploymentStats }) => deploymentStats !== undefined)
        .map(({ model_id: modelId }) => modelId);

      expect({ deployed, guidance: GUIDANCE }).toEqual({ deployed: [], guidance: GUIDANCE });
    });
  });
}

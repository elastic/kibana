/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const ml = getService('ml');
  const inferenceId = 'my-elser-model';
  const taskType = 'sparse_embedding';
  const service = 'elser';
  const modelId = '.elser_model_2';

  // FLAKY: https://github.com/elastic/kibana/issues/189333
  // Failing: See https://github.com/elastic/kibana/issues/189333
  describe.skip('Inference endpoints', function () {
    after(async () => {
      try {
        log.debug(`Deleting underlying trained model`);
        await ml.api.deleteTrainedModelES(modelId);
        await ml.testResources.cleanMLSavedObjects();
      } catch (err) {
        log.debug('[Cleanup error] Error deleting trained model or saved ml objects');
        throw err;
      }
    });
    it('create inference endpoint', async () => {
      log.debug(`create inference endpoint`);
      await ml.api.createInferenceEndpoint(inferenceId, taskType, {
        service,
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
          model_id: modelId,
        },
      });
    });
    it('get all inference endpoints and confirm inference endpoint exist', async () => {
      const { body: inferenceEndpoints } = await supertest
        .get(`${API_BASE_PATH}/inference/all`)
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'xxx')
        .expect(200);

      expect(inferenceEndpoints).to.be.ok();
      expect(
        inferenceEndpoints.some(
          (endpoint: InferenceAPIConfigResponse) => endpoint.model_id === inferenceId
        )
      ).to.be(true);
    });
    it('can delete inference endpoint', async () => {
      log.debug(`Deleting inference endpoint`);
      await ml.api.deleteInferenceEndpoint(inferenceId, taskType);
      log.debug('> Inference endpoint deleted');
    });
  });
}

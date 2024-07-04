/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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

  // FLAKY: https://github.com/elastic/kibana/issues/185216
  describe('Inference endpoints', function () {
    after(async () => {
      // Cleanup inference endpoints created for testing
      try {
        log.debug(`Deleting inference endpoint`);
        await ml.api.deleteInferenceEndpoint(inferenceId, taskType);
        log.debug(`Deleting underlying trained model`);
        await ml.api.deleteTrainedModelES(modelId);
        await ml.testResources.cleanMLSavedObjects();
      } catch (err) {
        log.debug('[Cleanup error] Error deleting inference endpoint');
        throw err;
      }
    });
    it('create inference endpoint', async () => {
      log.debug(`create inference endpoint`);
      const { body, status } = await ml.api.createInferenceEndpoint(inferenceId, taskType, {
        service,
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
          model_id: modelId,
        },
      });
      if (status === 408) {
        // handles the case when it takes a while to download and start trained model
        expect(body).to.have.property('error');
        expect(body.error).to.have.property('reason');
        expect(body.error.reason).to.eql(
          'Timed out after [30s] waiting for model deployment to start. Use the trained model stats API to track the state of the deployment.'
        );
      } else {
        expect(status).to.eql(200, `${JSON.stringify(body)}`);
      }
      log.debug('> Inference endpoint created');
    });
    it('get all inference endpoints and confirm inference endpoint exist', async () => {
      const { body: inferenceEndpoints } = await supertest
        .get(`${API_BASE_PATH}/inference/all`)
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'xxx')
        .expect(200);

      expect(inferenceEndpoints).to.be.ok();
      expect(inferenceEndpoints[0].model_id).to.eql(inferenceId);
    });
  });
}

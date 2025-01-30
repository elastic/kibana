/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const ml = getService('ml');
  const inferenceId = 'my-elser-model';
  const taskType = 'sparse_embedding';
  const service = 'elasticsearch';

  const modelId = '.elser_model_2';
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('Inference endpoints', function () {
    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
    });
    after(async () => {
      try {
        log.debug(`Deleting underlying trained model`);
        await ml.api.deleteTrainedModelES(modelId);
        await ml.testResources.cleanMLSavedObjects();
      } catch (err) {
        log.debug('[Cleanup error] Error deleting trained model and saved ml objects');
        throw err;
      }
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
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
      const { body: inferenceEndpoints } = await supertestWithoutAuth
        .get(`${API_BASE_PATH}/inference/all`)
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .expect(200);

      expect(inferenceEndpoints).to.be.ok();
      expect(
        inferenceEndpoints.some(
          (endpoint: InferenceAPIConfigResponse) => endpoint.inference_id === inferenceId
        )
      ).to.eql(true, `${inferenceId} not found in the GET _inference/_all response`);
    });
    it('can delete inference endpoint', async () => {
      log.debug(`Deleting inference endpoint`);
      await ml.api.deleteInferenceEndpoint(inferenceId, taskType);
      log.debug('> Inference endpoint deleted');
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/index_management';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const ml = getService('ml');
  const inferenceId = 'my-elser-model';
  const taskType = 'sparse_embedding';
  const service = 'elser';
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  // FLAKY: https://github.com/elastic/kibana/issues/185216
  describe.skip('Inference endpoints', function () {
    // test adds new trained model '.elser_model_2_linux-x86_64', but does not clean it. Follow up tests are affected
    this.tags(['failsOnMKI']);
    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      log.debug(`Creating inference endpoint`);
      try {
        await ml.api.createInferenceEndpoint(inferenceId, taskType, {
          service,
          service_settings: {
            num_allocations: 1,
            num_threads: 1,
          },
        });
      } catch (err) {
        log.debug('[Setup error] Error creating inference endpoint');
        throw err;
      }
    });

    after(async () => {
      // Cleanup inference endpoints created for testing purposes
      try {
        log.debug(`Deleting inference endpoint`);
        await ml.api.deleteInferenceEndpoint(inferenceId, taskType);
      } catch (err) {
        log.debug('[Cleanup error] Error deleting inference endpoint');
        throw err;
      }
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
    });

    describe('get inference endpoints', () => {
      it('returns the existing inference endpoints', async () => {
        const { body: inferenceEndpoints } = await supertestWithoutAuth
          .get(`${API_BASE_PATH}/inference/all`)
          .set(internalReqHeader)
          .set(roleAuthc.apiKeyHeader)
          .expect(200);

        expect(inferenceEndpoints).to.be.ok();
        expect(inferenceEndpoints[0].model_id).to.eql(inferenceId);
      });
    });
  });
}

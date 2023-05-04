/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { DATA_FRAME_TASK_STATE } from '@kbn/ml-plugin/common/constants/data_frame_analytics';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace3 = 'ihp_od_space3';
  const jobIdSpace4 = 'ihp_od_space4';
  const idSpace3 = 'space3';
  const idSpace4 = 'space4';

  async function runRequest(
    jobId: string,
    space: string,
    action: string,
    expectedStatusCode: number
  ) {
    const { body, status } = await supertest
      .post(`/s/${space}/api/ml/data_frame/analytics/${jobId}/${action}`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST data_frame/analytics/{analyticsId}/_stop with spaces', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await spacesService.create({ id: idSpace3, name: 'space_three', disabledFeatures: [] });
      await spacesService.create({ id: idSpace4, name: 'space_four', disabledFeatures: [] });
      // job config with high training percent so it takes longer to run
      const jobConfigSpace3 = ml.commonConfig.getDFABmClassificationJobConfig(jobIdSpace3);
      const jobConfigSpace4 = ml.commonConfig.getDFABmClassificationJobConfig(jobIdSpace4);
      // create jobs
      await ml.api.createDataFrameAnalyticsJob(jobConfigSpace3, idSpace3);
      await ml.api.createDataFrameAnalyticsJob(jobConfigSpace4, idSpace4);
      // start jobs
      await runRequest(jobIdSpace3, idSpace3, '_start', 200);
      await ml.api.waitForAnalyticsState(jobIdSpace3, DATA_FRAME_TASK_STATE.STARTED);
      await ml.api.assertIndicesExist(`user-${jobIdSpace3}`);
      await runRequest(jobIdSpace4, idSpace4, '_start', 200);
      await ml.api.waitForAnalyticsState(jobIdSpace4, DATA_FRAME_TASK_STATE.STARTED);
      await ml.api.assertIndicesExist(`user-${jobIdSpace4}`);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.deleteDataFrameAnalyticsJobES(jobIdSpace3);
      await ml.api.deleteDataFrameAnalyticsJobES(jobIdSpace4);
      await spacesService.delete(idSpace3);
      await spacesService.delete(idSpace4);
      await ml.api.deleteIndices(`user-${jobIdSpace3}`);
      await ml.api.deleteIndices(`user-${jobIdSpace4}`);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should stop job from same space', async () => {
      const body = await runRequest(jobIdSpace3, idSpace3, '_stop', 200);
      expect(body).to.have.property('stopped', true);
      await ml.api.waitForAnalyticsState(jobIdSpace3, DATA_FRAME_TASK_STATE.STOPPED, 5000);
    });

    it('should fail to stop job from different space', async () => {
      const body = await runRequest(jobIdSpace4, idSpace3, '_stop', 404);
      expect(body.error).to.eql('Not Found');
      await ml.api.waitForAnalyticsState(jobIdSpace4, DATA_FRAME_TASK_STATE.STARTED, 5000);
    });
  });
};

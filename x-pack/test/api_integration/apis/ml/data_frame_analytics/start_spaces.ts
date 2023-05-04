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

  const jobIdSpace1 = 'ihp_od_space1';
  const jobIdSpace2 = 'ihp_od_space2';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  const initialModelMemoryLimit = '17mb';

  async function runStartRequest(jobId: string, space: string, expectedStatusCode: number) {
    const { body, status } = await supertest
      .post(`/s/${space}/api/ml/data_frame/analytics/${jobId}/_start`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  let space1JobDestIndex: string;
  let space2JobDestIndex: string;

  describe('POST data_frame/analytics/{analyticsId}/_start with spaces', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      const jobConfigSpace1 = ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(jobIdSpace1);
      await ml.api.createDataFrameAnalyticsJob(
        { ...jobConfigSpace1, model_memory_limit: initialModelMemoryLimit },
        idSpace1
      );

      const jobConfigSpace2 = ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(jobIdSpace2);
      await ml.api.createDataFrameAnalyticsJob(
        { ...jobConfigSpace2, model_memory_limit: initialModelMemoryLimit },
        idSpace2
      );

      space1JobDestIndex = jobConfigSpace1.dest.index;
      space2JobDestIndex = jobConfigSpace2.dest.index;

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.deleteDataFrameAnalyticsJobES(jobIdSpace1);
      await ml.api.deleteDataFrameAnalyticsJobES(jobIdSpace2);
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.api.deleteIndices(space1JobDestIndex);
      await ml.api.deleteIndices(space2JobDestIndex);
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should start job from same space', async () => {
      const body = await runStartRequest(jobIdSpace1, idSpace1, 200);
      expect(body).to.have.property('acknowledged', true);

      await ml.api.waitForAnalyticsState(jobIdSpace1, DATA_FRAME_TASK_STATE.STARTED);
      await ml.api.assertIndicesExist(space1JobDestIndex);
    });

    it('should fail to start job from different space', async () => {
      const body = await runStartRequest(jobIdSpace2, idSpace1, 404);
      expect(body.error).to.eql('Not Found');

      await ml.api.waitForAnalyticsState(jobIdSpace1, DATA_FRAME_TASK_STATE.STOPPED);
    });
  });
};

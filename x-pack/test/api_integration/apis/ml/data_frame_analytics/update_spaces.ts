/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

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
  const newModelMemoryLimit = '21mb';

  async function runRequest(
    jobId: string,
    space: string,
    expectedStatusCode: number,
    requestBody: unknown
  ) {
    const { body, status } = await supertest
      .post(`/s/${space}/api/ml/data_frame/analytics/${jobId}/_update`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST data_frame/analytics _update with spaces', function () {
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

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should update job from same space', async () => {
      const body = await runRequest(jobIdSpace1, idSpace1, 200, {
        model_memory_limit: newModelMemoryLimit,
      });
      expect(body).to.have.property('model_memory_limit', newModelMemoryLimit);

      const getDFAJobResponse = await ml.api.getDataFrameAnalyticsJob(jobIdSpace1);
      expect(getDFAJobResponse.body.data_frame_analytics[0]).to.have.property(
        'model_memory_limit',
        newModelMemoryLimit
      );
    });

    it('should fail to update job from different space', async () => {
      await runRequest(jobIdSpace2, idSpace1, 404, { model_memory_limit: newModelMemoryLimit });

      const getDFAJobResponse = await ml.api.getDataFrameAnalyticsJob(jobIdSpace2);
      expect(getDFAJobResponse.body.data_frame_analytics[0]).to.have.property(
        'model_memory_limit',
        initialModelMemoryLimit
      );
    });
  });
};

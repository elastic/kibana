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

  async function runRequest(
    jobId: string,
    action: string,
    space: string,
    expectedStatusCode: number
  ) {
    const { body } = await supertest
      .post(`/s/${space}/api/ml/data_frame/analytics/${jobId}/${action}`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS)
      .expect(expectedStatusCode);

    return body;
  }

  describe('POST data_frame/analytics _start and _stop with spaces', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ihp_outlier');
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

    it('should start job from same space', async () => {
      const body = await runRequest(jobIdSpace1, '_start', idSpace1, 200);
      expect(body).to.have.property('acknowledged', true);
    });

    it('should fail to start job from different space', async () => {
      const body = await runRequest(jobIdSpace2, '_start', idSpace1, 404);
      expect(body.error).to.eql('Not Found');
    });

    it('should stop job from same space', async () => {
      const body = await runRequest(jobIdSpace1, '_stop', idSpace1, 200);
      expect(body).to.have.property('stopped', true);
    });

    it('should fail to stop job from different space', async () => {
      const body = await runRequest(jobIdSpace2, '_stop', idSpace1, 404);
      expect(body.error).to.eql('Not Found');
    });
  });
};

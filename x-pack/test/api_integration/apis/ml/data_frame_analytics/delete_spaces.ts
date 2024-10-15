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
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(jobId: string, space: string, expectedStatusCode: number) {
    const { body, status } = await supertest
      .delete(`/s/${space}/api/ml/data_frame/analytics/${jobId}`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('DELETE data_frame/analytics with spaces', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    beforeEach(async () => {
      const jobConfigSpace1 = ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(jobIdSpace1);
      await ml.api.createDataFrameAnalyticsJob(jobConfigSpace1, idSpace1);
    });

    afterEach(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
    });

    it('should delete job from same space', async () => {
      const body = await runRequest(jobIdSpace1, idSpace1, 200);

      expect(body.analyticsJobDeleted.success).to.eql(true);
      await ml.api.waitForDataFrameAnalyticsJobNotToExist(jobIdSpace1);
    });

    it('should fail to delete job from different space', async () => {
      await runRequest(jobIdSpace1, idSpace2, 404);
      await ml.api.waitForDataFrameAnalyticsJobToExist(jobIdSpace1);
    });
  });
};

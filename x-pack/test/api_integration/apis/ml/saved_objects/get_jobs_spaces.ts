/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobIdSpace1 = 'fq_single_space1';
  const adJobIdSpace2 = 'fq_single_space2';
  const dfaJobIdSpace1 = 'ihp_od_space1';
  const dfaJobIdSpace2 = 'ihp_od_space2';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(expectedStatusCode: number, user: USER) {
    const { body, status } = await supertest
      .get(`/api/ml/saved_objects/jobs_spaces`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET saved_objects/jobs_spaces', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdSpace1),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdSpace2),
        idSpace2
      );

      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobIdSpace1),
        idSpace1
      );
      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobIdSpace2),
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

    it('should list all jobs for user with access to all spaces', async () => {
      const body = await runRequest(200, USER.ML_VIEWER_ALL_SPACES);

      expect(body).to.have.property('anomaly-detector');
      expect(body['anomaly-detector']).to.eql({
        [adJobIdSpace1]: [idSpace1],
        [adJobIdSpace2]: [idSpace2],
      });

      expect(body).to.have.property('data-frame-analytics');
      expect(body['data-frame-analytics']).to.eql({
        [dfaJobIdSpace1]: [idSpace1],
        [dfaJobIdSpace2]: [idSpace2],
      });
    });

    it('should only list jobs for the space the user has access to', async () => {
      const body = await runRequest(200, USER.ML_VIEWER_SPACE1);

      expect(body).to.have.property('anomaly-detector');
      expect(body['anomaly-detector']).to.eql({
        [adJobIdSpace1]: [idSpace1],
      });

      expect(body).to.have.property('data-frame-analytics');
      expect(body['data-frame-analytics']).to.eql({
        [dfaJobIdSpace1]: [idSpace1],
      });
    });
  });
};

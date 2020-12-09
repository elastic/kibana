/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { JobType } from '../../../../../plugins/ml/common/types/saved_objects';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobId = 'fq_single';
  const dfaJobId = 'ihp_od';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';
  const defaultSpaceId = 'default';

  async function runRequest(
    requestBody: {
      jobType: JobType;
      jobIds: string[];
      spaces: string[];
    },
    expectedStatusCode: number,
    user: USER
  ) {
    const { body } = await supertest
      .post(`/api/ml/saved_objects/assign_job_to_space`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody)
      .expect(expectedStatusCode);

    return body;
  }

  describe('POST saved_objects/assign_job_to_space', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/ihp_outlier');
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    beforeEach(async () => {
      await ml.api.createAnomalyDetectionJob(ml.commonConfig.getADFqSingleMetricJobConfig(adJobId));
      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobId)
      );
    });

    afterEach(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
    });

    it('should assign AD job to space for user with access to that space', async () => {
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [defaultSpaceId]);
      const body = await runRequest(
        {
          jobType: 'anomaly-detector',
          jobIds: [adJobId],
          spaces: [idSpace1],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body).to.eql({ [adJobId]: { success: true } });
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [defaultSpaceId, idSpace1]);
    });

    it('should assign DFA job to space for user with access to that space', async () => {
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [defaultSpaceId]);
      const body = await runRequest(
        {
          jobType: 'data-frame-analytics',
          jobIds: [dfaJobId],
          spaces: [idSpace1],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body).to.eql({ [dfaJobId]: { success: true } });
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [defaultSpaceId, idSpace1]);
    });

    it('should fail to assign AD job to space the user has no access to', async () => {
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [defaultSpaceId]);
      const body = await runRequest(
        {
          jobType: 'anomaly-detector',
          jobIds: [adJobId],
          spaces: [idSpace2],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body[adJobId]).to.have.property('success', false);
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [defaultSpaceId]);
    });

    it('should fail to assign DFA job to space the user has no access to', async () => {
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [defaultSpaceId]);
      const body = await runRequest(
        {
          jobType: 'data-frame-analytics',
          jobIds: [dfaJobId],
          spaces: [idSpace2],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body[dfaJobId]).to.have.property('success', false);
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [defaultSpaceId]);
    });
  });
};

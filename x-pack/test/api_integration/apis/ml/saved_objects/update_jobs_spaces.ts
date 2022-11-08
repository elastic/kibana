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
      spacesToAdd: string[];
      spacesToRemove: string[];
    },
    expectedStatusCode: number,
    user: USER
  ) {
    const { body, status } = await supertest
      .post(`/api/ml/saved_objects/update_jobs_spaces`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST saved_objects/update_jobs_spaces', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
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
          spacesToAdd: [idSpace1],
          spacesToRemove: [defaultSpaceId],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body).to.eql({ [adJobId]: { success: true } });
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [idSpace1]);
    });

    it('should assign DFA job to space for user with access to that space', async () => {
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [defaultSpaceId]);
      const body = await runRequest(
        {
          jobType: 'data-frame-analytics',
          jobIds: [dfaJobId],
          spacesToAdd: [idSpace1],
          spacesToRemove: [defaultSpaceId],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body).to.eql({ [dfaJobId]: { success: true } });
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [idSpace1]);
    });

    it('should fail to update AD job spaces for space the user has no access to', async () => {
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [defaultSpaceId]);
      const body = await runRequest(
        {
          jobType: 'anomaly-detector',
          jobIds: [adJobId],
          spacesToAdd: [idSpace2],
          spacesToRemove: [],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body[adJobId]).to.have.property('success', false);
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [defaultSpaceId]);
    });

    it('should fail to update DFA job spaces for space the user has no access to', async () => {
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [defaultSpaceId]);
      const body = await runRequest(
        {
          jobType: 'data-frame-analytics',
          jobIds: [dfaJobId],
          spacesToAdd: [idSpace2],
          spacesToRemove: [],
        },
        200,
        USER.ML_POWERUSER_SPACE1
      );

      expect(body[dfaJobId]).to.have.property('success', false);
      await ml.api.assertJobSpaces(dfaJobId, 'data-frame-analytics', [defaultSpaceId]);
    });
  });
};

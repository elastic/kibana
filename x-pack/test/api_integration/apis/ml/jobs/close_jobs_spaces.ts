/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { JOB_STATE } from '@kbn/ml-plugin/common/constants/states';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import { USER } from '../../../../functional/services/ml/security_common';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace1 = 'fq_single_space1';
  const jobIdSpace2 = 'fq_single_space2';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(space: string, expectedStatusCode: number, jobIds?: string[]) {
    const { body, status } = await supertest
      .post(`/s/${space}/api/ml/jobs/close_jobs`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS)
      .send({ jobIds });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST close_jobs with spaces', function () {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    beforeEach(async () => {
      const jobConfigSpace1 = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfigSpace1, idSpace1);
      await ml.api.openAnomalyDetectionJob(jobIdSpace1);

      const jobConfigSpace2 = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace2);
      await ml.api.createAnomalyDetectionJob(jobConfigSpace2, idSpace2);
      await ml.api.openAnomalyDetectionJob(jobIdSpace2);
    });

    afterEach(async () => {
      await ml.api.closeAnomalyDetectionJob(jobIdSpace1);
      await ml.api.closeAnomalyDetectionJob(jobIdSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
    });

    it('should close single job from same space', async () => {
      const body = await runRequest(idSpace1, 200, [jobIdSpace1]);
      expect(body).to.eql({ [jobIdSpace1]: { closed: true } });
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.CLOSED);
    });

    it('should not close single job from different space', async () => {
      const body = await runRequest(idSpace2, 200, [jobIdSpace1]);
      expect(body).to.eql({ [jobIdSpace1]: { closed: false } });
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.OPENED);
    });

    it('should only close job from same space when called with a list of jobs', async () => {
      const body = await runRequest(idSpace1, 200, [jobIdSpace1, jobIdSpace2]);
      expect(body).to.eql({ [jobIdSpace1]: { closed: true }, [jobIdSpace2]: { closed: false } });
      await ml.api.waitForJobState(jobIdSpace1, JOB_STATE.CLOSED);
      await ml.api.waitForJobState(jobIdSpace2, JOB_STATE.OPENED);
    });
  });
};

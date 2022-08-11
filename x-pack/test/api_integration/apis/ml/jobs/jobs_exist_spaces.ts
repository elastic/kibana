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
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace1 = 'fq_single_space1';
  const jobIdSpace2 = 'fq_single_space2';
  const groupSpace1 = 'farequote';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(space: string, expectedStatusCode: number, jobIds?: string[]) {
    const { body, status } = await supertest
      .post(`/s/${space}/api/ml/jobs/jobs_exist`)
      .auth(
        USER.ML_VIEWER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_VIEWER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS)
      .send({ jobIds });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST jobs_exist with spaces', function () {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      const jobConfigSpace1 = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfigSpace1, idSpace1);

      const jobConfigSpace2 = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace2);
      await ml.api.createAnomalyDetectionJob(jobConfigSpace2, idSpace2);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should find single job from same space', async () => {
      const body = await runRequest(idSpace1, 200, [jobIdSpace1]);
      expect(body).to.eql({ [jobIdSpace1]: { exists: true, isGroup: false } });
    });

    it('should find single job from same space', async () => {
      const body = await runRequest(idSpace1, 200, [groupSpace1]);
      expect(body).to.eql({ [groupSpace1]: { exists: true, isGroup: true } });
    });

    it('should not find single job from different space', async () => {
      const body = await runRequest(idSpace2, 200, [jobIdSpace1]);
      expect(body).to.eql({ [jobIdSpace1]: { exists: false, isGroup: false } });
    });

    it('should only find job from same space when called with a list of jobs', async () => {
      const body = await runRequest(idSpace1, 200, [jobIdSpace1, jobIdSpace2]);
      expect(body).to.eql({
        [jobIdSpace1]: { exists: true, isGroup: false },
        [jobIdSpace2]: { exists: false, isGroup: false },
      });
    });
  });
};

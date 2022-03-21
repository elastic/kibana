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
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace1 = 'fq_single_space1';
  const jobIdWildcardSpace1 = 'fq_single_space1*';
  const jobGroupSpace1 = 'space1_group';
  const jobGroupWildcardSpace1 = 'space1_group*';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function getJobById(
    jobOrGroup: string | undefined,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body, status } = await supertest
      .get(
        `${space ? `/s/${space}` : ''}/api/ml/anomaly_detectors${
          jobOrGroup ? `/${jobOrGroup}` : ''
        }`
      )
      .auth(
        USER.ML_VIEWER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_VIEWER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET anomaly_detectors with spaces', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob({ ...jobConfig, groups: [jobGroupSpace1] }, idSpace1);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should fail with non-existing job', async () => {
      await getJobById('non-existing-job', 404);
    });

    it('should return empty list with non-existing job wildcard', async () => {
      const body = await getJobById('non-existing-job*', 200);

      expect(body.count).to.eql(0, `response count should be 0 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        0,
        `response jobs list should be empty (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should fail with job from different space', async () => {
      await getJobById(jobIdSpace1, 404, idSpace2);
    });

    it('should return all jobs when not specifying id', async () => {
      const body = await getJobById(undefined, 200, idSpace1);

      expect(body.count).to.eql(1, `response count should be 1 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        1,
        `response jobs list should contain correct job (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should return empty list when not specifying id in difference space', async () => {
      const body = await getJobById(undefined, 200, idSpace2);

      expect(body.count).to.eql(0, `response count should be 0 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        0,
        `response jobs list should be empty (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should return job with job id from correct space', async () => {
      const body = await getJobById(jobIdSpace1, 200, idSpace1);

      expect(body.count).to.eql(1, `response count should be 1 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        1,
        `response jobs list should contain correct job (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should return job with job wildcard from correct space', async () => {
      const body = await getJobById(jobIdWildcardSpace1, 200, idSpace1);

      expect(body.count).to.eql(1, `response count should be 1 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        1,
        `response jobs list should contain correct job (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should return empty list with job wildcard from different space', async () => {
      const body = await getJobById(jobIdWildcardSpace1, 200, idSpace2);

      expect(body.count).to.eql(0, `response count should be 0 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        0,
        `response jobs list should be empty (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should return job by group from same space', async () => {
      const body = await getJobById(jobGroupSpace1, 200, idSpace1);

      expect(body.count).to.eql(1, `response count should be 1 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        1,
        `response jobs list should have one element (got ${JSON.stringify(body.jobs)})`
      );
      expect(body.jobs[0].job_id).to.eql(
        jobIdSpace1,
        `response job id should be ${jobIdSpace1} (got ${body.jobs[0].job_id})`
      );
    });

    it('should return job by group wildcard from same space', async () => {
      const body = await getJobById(jobGroupWildcardSpace1, 200, idSpace1);

      expect(body.count).to.eql(1, `response count should be 1 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        1,
        `response jobs list should have one element (got ${JSON.stringify(body.jobs)})`
      );
      expect(body.jobs[0].job_id).to.eql(
        jobIdSpace1,
        `response job id should be ${jobIdSpace1} (got ${body.jobs[0].job_id})`
      );
    });

    it('should fail with group from different space', async () => {
      await getJobById(jobGroupSpace1, 404, idSpace2);
    });

    it('should return empty list with group wildcard from different space', async () => {
      const body = await getJobById(jobGroupWildcardSpace1, 200, idSpace2);

      expect(body.count).to.eql(0, `response count should be 0 (got ${body.count})`);
      expect(body.jobs.length).to.eql(
        0,
        `response jobs list should be empty (got ${JSON.stringify(body.jobs)})`
      );
    });
  });
};

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
import { DATAFEED_STATE } from '../../../../../plugins/ml/common/constants/states';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const idSpace1 = 'space1';
  const idSpace2 = 'space2';
  const jobIdSpace1 = `fq_single_${idSpace1}`;
  const jobIdSpace2 = `fq_single_${idSpace2}`;
  const datafeedIdSpace1 = `datafeed-${jobIdSpace1}`;
  const datafeedIdSpace2 = `datafeed-${jobIdSpace2}`;
  const startMs = 1454803200000; // Feb 7 2016 00:00
  const endMs = 1455235200000; // Feb 12 2016 00:00

  async function runRequest(
    space: string,
    expectedStatusCode: number,
    datafeedIds: string[],
    start: number,
    end: number
  ): Promise<Record<string, { started: boolean; error?: string }>> {
    const { body, status } = await supertest
      .post(`/s/${space}/api/ml/jobs/force_start_datafeeds`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS)
      .send({ datafeedIds, start, end });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('force_start_datafeeds with spaces', function () {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    beforeEach(async () => {
      const jobConfigSpace1 = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      const datafeedConfigSpace1 = ml.commonConfig.getADFqDatafeedConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfigSpace1, idSpace1);
      await ml.api.createDatafeed(
        {
          ...datafeedConfigSpace1,
          datafeed_id: datafeedIdSpace1,
          job_id: jobIdSpace1,
        },
        idSpace1
      );
      const jobConfigSpace2 = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace2);
      const datafeedConfigSpace2 = ml.commonConfig.getADFqDatafeedConfig(jobIdSpace2);
      await ml.api.createAnomalyDetectionJob(jobConfigSpace2, idSpace2);
      await ml.api.createDatafeed(
        {
          ...datafeedConfigSpace2,
          datafeed_id: datafeedIdSpace2,
          job_id: jobIdSpace2,
        },
        idSpace2
      );
    });

    afterEach(async () => {
      await ml.api.closeAnomalyDetectionJob(jobIdSpace1);
      await ml.api.closeAnomalyDetectionJob(jobIdSpace2);
      await ml.api.deleteAnomalyDetectionJobES(jobIdSpace1);
      await ml.api.deleteAnomalyDetectionJobES(jobIdSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
    });

    it('should start single datafeed from same space', async () => {
      const body = await runRequest(idSpace1, 200, [datafeedIdSpace1], startMs, endMs);
      expect(body).to.eql({ [datafeedIdSpace1]: { started: true } });
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);
    });

    it('should not start single datafeed from different space', async () => {
      const body = await runRequest(idSpace2, 200, [datafeedIdSpace1], startMs, endMs);
      expect(body).to.eql({ [datafeedIdSpace1]: { error: 'Job has no datafeed', started: false } });
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STOPPED);
    });

    it('should only start datafeed from same space when called with a list of datafeeds', async () => {
      const body = await runRequest(
        idSpace1,
        200,
        [datafeedIdSpace1, datafeedIdSpace2],
        startMs,
        endMs
      );
      expect(body).to.eql({
        [datafeedIdSpace1]: { started: true },
        [datafeedIdSpace2]: { error: 'Job has no datafeed', started: false },
      });
      await ml.api.waitForDatafeedState(datafeedIdSpace1, DATAFEED_STATE.STARTED);
      await ml.api.waitForDatafeedState(datafeedIdSpace2, DATAFEED_STATE.STOPPED);
    });
  });
};

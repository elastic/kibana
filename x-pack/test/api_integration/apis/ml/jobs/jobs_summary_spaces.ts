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
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(space: string, expectedStatusCode: number, jobIds?: string[]) {
    const { body, status } = await supertest
      .post(`/s/${space}/api/ml/jobs/jobs_summary`)
      .auth(
        USER.ML_VIEWER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_VIEWER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS)
      .send({ jobIds });
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST jobs_summary with spaces', function () {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfig, idSpace1);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should list job from same space', async () => {
      const body = await runRequest(idSpace1, 200);

      expect(body).to.have.length(
        1,
        `response list should have 1 object (got ${JSON.stringify(body)})`
      );
      expect(body[0].id).to.eql(
        jobIdSpace1,
        `response job id should be ${jobIdSpace1} (got ${body[0].id})`
      );
    });

    it('should list job from same space by job id', async () => {
      const body = await runRequest(idSpace1, 200, [jobIdSpace1]);

      expect(body).to.have.length(
        1,
        `response list should have 1 object (got ${JSON.stringify(body)})`
      );
      expect(body[0].id).to.eql(
        jobIdSpace1,
        `response job id should be ${jobIdSpace1} (got ${body[0].id})`
      );
    });

    it('should not list job from different space', async () => {
      const body = await runRequest(idSpace2, 200);

      expect(body).to.have.length(0, `response list should be empty (got ${JSON.stringify(body)})`);
    });

    it('should not list job from different space by job id', async () => {
      const body = await runRequest(idSpace2, 200, [jobIdSpace1]);

      expect(body).to.have.length(0, `response list should be empty (got ${JSON.stringify(body)})`);
    });
  });
};

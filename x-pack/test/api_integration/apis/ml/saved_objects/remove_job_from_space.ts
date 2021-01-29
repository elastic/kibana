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
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobId = 'fq_single';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function runRequest(
    requestBody: {
      jobType: JobType;
      jobIds: string[];
      spaces: string[];
    },
    expectedStatusCode: number,
    user: USER,
    space?: string
  ) {
    const { body } = await supertest
      .post(`${space ? `/s/${space}` : ''}/api/ml/saved_objects/remove_job_from_space`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(requestBody)
      .expect(expectedStatusCode);

    return body;
  }

  describe('POST saved_objects/remove_job_from_space', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    beforeEach(async () => {
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobId),
        idSpace1
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

    it('should remove job from same space', async () => {
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [idSpace1]);

      const body = await runRequest(
        {
          jobType: 'anomaly-detector',
          jobIds: [adJobId],
          spaces: [idSpace1],
        },
        200,
        USER.ML_POWERUSER_ALL_SPACES,
        idSpace1
      );

      expect(body).to.eql({ [adJobId]: { success: true } });
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', []);
    });

    it('should not find job to remove from different space', async () => {
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [idSpace1]);

      const body = await runRequest(
        {
          jobType: 'anomaly-detector',
          jobIds: [adJobId],
          spaces: [idSpace1],
        },
        200,
        USER.ML_POWERUSER_ALL_SPACES,
        idSpace2
      );

      expect(body).to.eql({});
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [idSpace1]);
    });
  });
};

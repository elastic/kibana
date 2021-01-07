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

  const adJobIdSpace12 = 'fq_single_space12';
  const adJobIdStarSpace = 'fq_single_star_space';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';
  const idStarSpace = '-';

  async function runRequest(
    jobType: JobType,
    jobIds: string[],
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body } = await supertest
      .post(`${space ? `/s/${space}` : ''}/api/ml/saved_objects/can_delete_job/${jobType}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send({ jobIds })
      .expect(expectedStatusCode);
    return body;
  }

  describe('POST saved_objects/can_delete_job', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });
      await spacesService.create({ id: idStarSpace, name: '*', disabledFeatures: [] });

      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdSpace12),
        idSpace1
      );
      await ml.api.createAnomalyDetectionJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobIdStarSpace),
        idStarSpace
      );

      await ml.api.asignJobToSpaces(adJobIdSpace12, 'anomaly-detector', [idSpace2], idSpace1);
      await ml.api.assertJobSpaces(adJobIdSpace12, 'anomaly-detector', [idSpace1, idSpace2]);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await spacesService.delete(idStarSpace);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('job in individual spaces, single space user can only untag', async () => {
      const body = await runRequest(
        'anomaly-detector',
        [adJobIdSpace12],
        USER.ML_POWERUSER_SPACE1,
        200,
        idSpace1
      );

      expect(body).to.eql({ [adJobIdSpace12]: { canDelete: false, canRemoveFromSpace: true } });
    });

    it('job in individual spaces, all spaces user can delete and untag', async () => {
      const body = await runRequest(
        'anomaly-detector',
        [adJobIdSpace12],
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      expect(body).to.eql({ [adJobIdSpace12]: { canDelete: true, canRemoveFromSpace: true } });
    });

    it('job in * space, single space user can not untag or delete', async () => {
      const body = await runRequest(
        'anomaly-detector',
        [adJobIdStarSpace],
        USER.ML_POWERUSER_SPACE1,
        200,
        idSpace1
      );

      expect(body).to.eql({ [adJobIdStarSpace]: { canDelete: false, canRemoveFromSpace: false } });
    });

    it('job in * space, all spaces user can delete but not untag', async () => {
      const body = await runRequest(
        'anomaly-detector',
        [adJobIdStarSpace],
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idStarSpace
      );

      expect(body).to.eql({ [adJobIdStarSpace]: { canDelete: true, canRemoveFromSpace: false } });
    });
  });
};

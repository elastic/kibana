/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace1 = 'fq_single_space1';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  describe('PUT anomaly_detectors with spaces', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should create a job in the current space', async () => {
      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);

      await ml.testExecution.logTestStep('should create job');
      const { body, status } = await supertest
        .put(`/s/${idSpace1}/api/ml/anomaly_detectors/${jobIdSpace1}`)
        .auth(
          USER.ML_POWERUSER_ALL_SPACES,
          ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send(jobConfig);
      ml.api.assertResponseStatusCode(200, status, body);

      await ml.testExecution.logTestStep(`job should be in space '${idSpace1}' only`);
      await ml.api.assertJobSpaces(jobIdSpace1, 'anomaly-detector', [idSpace1]);
    });
  });
};

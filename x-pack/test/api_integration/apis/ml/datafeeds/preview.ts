/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const esArchiver = getService('esArchiver');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const jobIdSpace1 = 'fq_single_space1';
  const datafeedIdSpace1 = `datafeed-${jobIdSpace1}`;
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function getDatafeedPreview(
    datafeedId: string,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body, status } = await supertest
      .get(`${space ? `/s/${space}` : ''}/internal/ml/datafeeds/${datafeedId}/_preview`)
      .auth(
        USER.ML_POWERUSER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER_ALL_SPACES)
      )
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET datafeed preview', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfig, idSpace1);
      const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobIdSpace1);
      await ml.api.createDatafeed(datafeedConfig, idSpace1);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should fail with non-existing datafeed', async () => {
      await getDatafeedPreview('non-existing-datafeed', 404);
    });

    it('should return datafeed preview with datafeed id from correct space', async () => {
      const body = await getDatafeedPreview(datafeedIdSpace1, 200, idSpace1);
      expect(body.length).to.eql(1000, `response length should be 1000 (got ${body.length})`);
    });

    it('should fail with datafeed from different space', async () => {
      await getDatafeedPreview(datafeedIdSpace1, 404, idSpace2);
    });
  });
};

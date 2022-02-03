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
  const datafeedIdSpace1 = `datafeed-${jobIdSpace1}`;
  const idSpace1 = 'space1';

  async function getDatafeedById(
    datafeedId: string | undefined,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body } = await supertest
      .get(`${space ? `/s/${space}` : ''}/api/ml/datafeeds${datafeedId ? `/${datafeedId}` : ''}`)
      .auth(
        USER.ML_VIEWER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_VIEWER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS)
      .expect(expectedStatusCode);

    return body;
  }

  describe('update datafeeds with spaces', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });

      const jobConfig = ml.commonConfig.getADFqSingleMetricJobConfig(jobIdSpace1);
      await ml.api.createAnomalyDetectionJob(jobConfig, idSpace1);
      const datafeedConfig = ml.commonConfig.getADFqDatafeedConfig(jobIdSpace1);
      await ml.api.createDatafeed(datafeedConfig, idSpace1);

      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should update datafeed with correct space', async () => {
      const newQueryDelay = '80000ms';

      await ml.api.updateDatafeed(
        { datafeed_id: datafeedIdSpace1, body: { query_delay: newQueryDelay } },
        idSpace1
      );

      const body = await getDatafeedById(datafeedIdSpace1, 200, idSpace1);
      const receivedQueryDelay = body.datafeeds[0]?.query_delay;

      expect(receivedQueryDelay).to.eql(
        newQueryDelay,
        `response datafeed query_delay list should be ${newQueryDelay} (got ${receivedQueryDelay})`
      );
    });
  });
};

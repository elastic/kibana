/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
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
  const idSpace2 = 'space2';

  const newQueryDelay = '80000ms';

  async function updateDatafeed(
    datafeedConfig: estypes.MlUpdateDatafeedRequest,
    user: USER,
    expectedStatusCode: number,
    space?: string
  ) {
    const datafeedId = datafeedConfig.datafeed_id;
    const { body, status } = await supertest
      .post(`${space ? `/s/${space}` : ''}/api/ml/datafeeds/${datafeedId}/_update`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(COMMON_REQUEST_HEADERS)
      .send(datafeedConfig.body);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('update datafeeds with spaces', () => {
    before(async () => {
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

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

    it('should update datafeed with correct space', async () => {
      await updateDatafeed(
        { datafeed_id: datafeedIdSpace1, body: { query_delay: newQueryDelay } },
        USER.ML_POWERUSER_ALL_SPACES,
        200,
        idSpace1
      );

      const { body } = await ml.api.getDatafeed(datafeedIdSpace1);
      const receivedQueryDelay = body.datafeeds[0]?.query_delay;

      expect(receivedQueryDelay).to.eql(
        newQueryDelay,
        `response datafeed query_delay list should be ${newQueryDelay} (got ${receivedQueryDelay})`
      );
    });

    it('should not update datafeed with incorrect space', async () => {
      await updateDatafeed(
        { datafeed_id: datafeedIdSpace1, body: { query_delay: newQueryDelay } },
        USER.ML_POWERUSER_ALL_SPACES,
        404,
        idSpace2
      );
    });

    it('should not be updatable by ml viewer user', async () => {
      await updateDatafeed(
        { datafeed_id: datafeedIdSpace1, body: { query_delay: newQueryDelay } },
        USER.ML_VIEWER_ALL_SPACES,
        403,
        idSpace1
      );
    });
  });
};

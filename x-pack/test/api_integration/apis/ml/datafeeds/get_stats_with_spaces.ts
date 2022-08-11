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
  const datafeedIdWildcardSpace1 = `datafeed-${jobIdSpace1}*`;
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  async function getDatafeedStatsById(
    datafeedId: string | undefined,
    expectedStatusCode: number,
    space?: string
  ) {
    const { body, status } = await supertest
      .get(
        `${space ? `/s/${space}` : ''}/api/ml/datafeeds${datafeedId ? `/${datafeedId}` : ''}/_stats`
      )
      .auth(
        USER.ML_VIEWER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_VIEWER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET datafeed stats with spaces', () => {
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

    it('should fail with non-existing datafeed', async () => {
      await getDatafeedStatsById('non-existing-datafeed', 404);
    });

    it('should return datafeed stats with datafeed id from correct space', async () => {
      const body = await getDatafeedStatsById(datafeedIdSpace1, 200, idSpace1);

      expect(body.count).to.eql(1, `response count should be 1 (got ${body.count})`);
      expect(body.datafeeds.length).to.eql(
        1,
        `response datafeeds list should contain correct datafeed (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should return datafeed stats with datafeed wildcard from correct space', async () => {
      const body = await getDatafeedStatsById(datafeedIdWildcardSpace1, 200, idSpace1);

      expect(body.count).to.eql(1, `response count should be 1 (got ${body.count})`);
      expect(body.datafeeds.length).to.eql(
        1,
        `response datafeeds list should contain correct datafeed (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should return all datafeed stats when not specifying id', async () => {
      const body = await getDatafeedStatsById(undefined, 200, idSpace1);

      expect(body.count).to.eql(1, `response count should be 1 (got ${body.count})`);
      expect(body.datafeeds.length).to.eql(
        1,
        `response datafeeds list should contain correct datafeed (got ${JSON.stringify(body.jobs)})`
      );
    });

    it('should return empty list with non-existing datafeed wildcard', async () => {
      const body = await getDatafeedStatsById('non-existing-datafeed*', 200);

      expect(body.count).to.eql(0, `response count should be 0 (got ${body.count})`);
      expect(body.datafeeds.length).to.eql(
        0,
        `response datafeed list should be empty (got ${JSON.stringify(body.datafeeds)})`
      );
    });

    it('should fail with datafeed from different space', async () => {
      await getDatafeedStatsById(datafeedIdSpace1, 404, idSpace2);
    });

    it('should return empty list with datafeed wildcard from different space', async () => {
      const body = await getDatafeedStatsById(datafeedIdWildcardSpace1, 200, idSpace2);

      expect(body.count).to.eql(0, `response count should be 0 (got ${body.count})`);
      expect(body.datafeeds.length).to.eql(
        0,
        `response datafeed list should be empty (got ${JSON.stringify(body.datafeeds)})`
      );
    });
  });
};

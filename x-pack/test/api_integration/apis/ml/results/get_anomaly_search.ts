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
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const spacesService = getService('spaces');
  const supertest = getService('supertestWithoutAuth');

  const adJobId = 'fq_single';
  const idSpace1 = 'space1';
  const idSpace2 = 'space2';

  const jobQuery = {
    size: 1,
    body: {
      query: {
        bool: {
          filter: [{ term: { job_id: adJobId } }],
        },
      },
    },
  };

  async function runRequest(
    requestBody: {
      jobIds: string[];
      query: any;
    },
    space: string,
    expectedStatusCode: number,
    user: USER
  ) {
    const { body, status } = await supertest
      .post(`/s/${space}/internal/ml/results/anomaly_search`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send(requestBody);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('POST results/anomaly_search', () => {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');

      // create spaces
      await spacesService.create({ id: idSpace1, name: 'space_one', disabledFeatures: [] });
      await spacesService.create({ id: idSpace2, name: 'space_two', disabledFeatures: [] });

      await ml.api.createAndRunAnomalyDetectionLookbackJob(
        ml.commonConfig.getADFqSingleMetricJobConfig(adJobId),
        ml.commonConfig.getADFqDatafeedConfig(adJobId),
        { space: idSpace1 }
      );
      await ml.api.assertJobSpaces(adJobId, 'anomaly-detector', [idSpace1]);
    });

    after(async () => {
      await spacesService.delete(idSpace1);
      await spacesService.delete(idSpace2);
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    it('should see results in current space', async () => {
      const body = await runRequest(
        {
          jobIds: [adJobId],
          query: jobQuery,
        },
        idSpace1,
        200,
        USER.ML_POWERUSER
      );
      expect(body.hits.hits[0]._source.job_id).to.eql(
        adJobId,
        `Expected job_id to equal ${adJobId}`
      );
    });

    it('should not see results in different space', async () => {
      const body = await runRequest(
        {
          jobIds: [adJobId],
          query: jobQuery,
        },
        idSpace2,
        404,
        USER.ML_POWERUSER
      );
      expect(body.message).to.eql(`${adJobId} missing`);
    });
  });
};

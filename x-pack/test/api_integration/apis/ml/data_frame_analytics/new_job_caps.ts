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
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const supertest = getService('supertestWithoutAuth');
  const testIndexPattern = 'ft_bank_marketing';

  async function runRequest(indexPattern: string, expectedStatusCode: number, rollup?: boolean) {
    let url = `/api/ml/data_frame/analytics/new_job_caps/${indexPattern}`;
    if (rollup !== undefined) {
      url += `?rollup=${rollup}`;
    }
    const { body, status } = await supertest
      .get(url)
      .auth(
        USER.ML_VIEWER_ALL_SPACES,
        ml.securityCommon.getPasswordForUser(USER.ML_VIEWER_ALL_SPACES)
      )
      .set(COMMON_REQUEST_HEADERS);
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET data_frame/analytics/new_job_caps', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await ml.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('should return job capabilities of fields for an index that exists', async () => {
      const body = await runRequest(testIndexPattern, 200);
      await ml.testExecution.logTestStep(
        `response should contain object for ${testIndexPattern} index pattern`
      );
      expect(body).to.have.keys(testIndexPattern);
      const testIndexPatternCaps = body[testIndexPattern];

      // The data frame analytics UI does not use the aggs prop, so just perform basic checks this prop
      await ml.testExecution.logTestStep(
        `should contain aggs and fields props for ${testIndexPattern} index pattern`
      );
      expect(testIndexPatternCaps).to.have.keys('aggs', 'fields');
      const aggs = testIndexPatternCaps.aggs;
      expect(aggs).to.have.length(35);

      // The data frames analytics UI uses this endpoint to extract the names and types of fields,
      // so check this info is present for some example fields
      const fields = testIndexPatternCaps.fields;
      expect(fields).to.have.length(24);

      await ml.testExecution.logTestStep(
        `fields should contain expected name and type attributes for ${testIndexPattern} index pattern`
      );
      const balanceTextField = fields.find((obj: any) => obj.id === 'balance');
      expect(balanceTextField).to.have.keys('name', 'type');
      expect(balanceTextField.name).to.eql('balance');
      expect(balanceTextField.type).to.eql('text');

      const balanceKeywordField = fields.find((obj: any) => obj.id === 'balance.keyword');
      expect(balanceKeywordField).to.have.keys('name', 'type');
      expect(balanceKeywordField.name).to.eql('balance.keyword');
      expect(balanceKeywordField.type).to.eql('keyword');
    });

    it('should fail to return job capabilities of fields for an index that does not exist', async () => {
      await runRequest(`${testIndexPattern}_invalid`, 404);
    });

    it('should return empty job capabilities of fields for a non-rollup index with rollup parameter set to true', async () => {
      const body = await runRequest(testIndexPattern, 200, true);
      await ml.testExecution.logTestStep(
        `response should contain object for ${testIndexPattern} index pattern`
      );
      expect(body).to.have.keys(testIndexPattern);
      const testIndexPatternCaps = body[testIndexPattern];

      await ml.testExecution.logTestStep(
        `should contain empty aggs and fields props for ${testIndexPattern} index pattern`
      );
      expect(testIndexPatternCaps).to.have.keys('aggs', 'fields');
      const aggs = testIndexPatternCaps.aggs;
      expect(aggs).to.have.length(0);
      const fields = testIndexPatternCaps.fields;
      expect(fields).to.have.length(0);
    });
  });
};

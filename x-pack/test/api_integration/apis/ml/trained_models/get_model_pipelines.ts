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
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('GET trained_models/pipelines', () => {
    let testModelIds: string[] = [];

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      testModelIds = await ml.api.createTestTrainedModels('regression', 2, true);
    });

    after(async () => {
      // delete all created ingest pipelines
      await Promise.all(testModelIds.map((modelId) => ml.api.deleteIngestPipeline(modelId)));
      await ml.api.cleanMlIndices();
    });

    it('returns trained model pipelines by id', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_0/pipelines`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(1);
      expect(body[0].model_id).to.eql('dfa_regression_model_n_0');
      expect(Object.keys(body[0].pipelines).length).to.eql(1);
    });

    it('returns an error in case user does not have required permission', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_0/pipelines`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};

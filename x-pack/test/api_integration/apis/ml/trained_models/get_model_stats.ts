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

  describe('GET trained_models/_stats', () => {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createTestTrainedModels('regression', 2);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('returns trained model stats by id', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_0/_stats`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.count).to.eql(1);
      expect(body.trained_model_stats[0].model_id).to.eql('dfa_regression_model_n_0');
    });

    it('returns 404 if requested trained model does not exist', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/not_existing_model/_stats`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(404, status, body);
    });

    it('returns an error for unauthorized user', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_0/_stats`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};

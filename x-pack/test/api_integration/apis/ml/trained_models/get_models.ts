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

  describe('GET trained_models', () => {
    let testModelIds: string[] = [];

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      testModelIds = await ml.api.createTestTrainedModels('regression', 5, true);
      await ml.api.createModelAlias('dfa_regression_model_n_0', 'dfa_regression_model_alias');
      await ml.api.createIngestPipeline('dfa_regression_model_alias');
    });

    after(async () => {
      // delete created ingest pipelines
      await Promise.all(
        ['dfa_regression_model_alias', ...testModelIds].map((modelId) =>
          ml.api.deleteIngestPipeline(modelId)
        )
      );
      await ml.api.cleanMlIndices();
    });

    it('returns all trained models with associated pipelines including aliases', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models?with_pipelines=true`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      // Created models + system model
      expect(body.length).to.eql(6);

      const sampleModel = body.find((v: any) => v.model_id === 'dfa_regression_model_n_0');
      expect(Object.keys(sampleModel.pipelines).length).to.eql(2);
    });

    it('returns models without pipeline in case user does not have required permission', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models?with_pipelines=true`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      // Created models + system model
      expect(body.length).to.eql(6);
      const sampleModel = body.find((v: any) => v.model_id === 'dfa_regression_model_n_0');
      expect(sampleModel.pipelines).to.eql(undefined);
    });

    it('returns trained model by id', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_1`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.length).to.eql(1);
      expect(body[0].model_id).to.eql('dfa_regression_model_n_1');
    });

    it('returns 404 if requested trained model does not exist', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/not_existing_model`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(404, status, body);
    });

    it('returns an error for unauthorized user', async () => {
      const { body, status } = await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_1`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';
import expect from '../../../../../../../../../../private/var/tmp/_bazel_darnautov/1afe62330ff0d9ae1ca2013aad33fd76/execroot/kibana/bazel-out/darwin-fastbuild/bin/packages/kbn-expect';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  describe('DELETE trained_models', () => {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.api.createdTestTrainedModels('regression', 2);
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    it('deletes trained model by id', async () => {
      const { body: deleteResponseBody } = await supertest
        .delete(`/api/ml/trained_models/dfa_regression_model_n_0`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(deleteResponseBody).to.eql({ acknowledged: true });

      // verify that model is actually deleted
      await supertest
        .get(`/api/ml/trained_models/dfa_regression_model_n_0`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(404);
    });

    it('does not allow to delete trained model if the user does not have required permissions', async () => {
      await supertest
        .delete(`/api/ml/trained_models/dfa_regression_model_n_0`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(403);
    });
  });
};

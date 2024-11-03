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
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  async function runRequest(user: USER, expectedStatusCode: number) {
    const { body, status } = await supertest
      .get(`/internal/ml/ml_node_count`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));
    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);

    return body;
  }

  describe('GET ml/ml_node_count', function () {
    describe('get ml node count', () => {
      it('should match expected values', async () => {
        const resp = await runRequest(USER.ML_POWERUSER, 200);
        expect(resp.count).to.be.greaterThan(0, 'count should be greater than 0');
        expect(resp.lazyNodeCount).to.be.greaterThan(
          -1,
          'lazyNodeCount should be greater or equal to 0'
        );
      });

      it('should should fail for a unauthorized user', async () => {
        await runRequest(USER.ML_UNAUTHORIZED, 403);
      });
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { GetTransformNodesResponseSchema } from '@kbn/transform-plugin/common/api_schemas/transforms';
import { isGetTransformNodesResponseSchema } from '@kbn/transform-plugin/common/api_schemas/type_guards';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  const expected = {
    apiTransformTransformsNodes: {
      minCount: 1,
    },
  };

  function assertTransformsNodesResponseBody(body: GetTransformNodesResponseSchema) {
    expect(isGetTransformNodesResponseSchema(body)).to.eql(true);

    expect(body.count).to.not.be.lessThan(expected.apiTransformTransformsNodes.minCount);
  }

  describe('/api/transform/transforms/_nodes', function () {
    it('should return the number of available transform nodes for a power user', async () => {
      const { body, status } = await supertest
        .get('/api/transform/transforms/_nodes')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send();
      transform.api.assertResponseStatusCode(200, status, body);

      assertTransformsNodesResponseBody(body);
    });

    it('should return the number of available transform nodes for a viewer user', async () => {
      const { body, status } = await supertest
        .get('/api/transform/transforms/_nodes')
        .auth(
          USER.TRANSFORM_VIEWER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send();
      transform.api.assertResponseStatusCode(200, status, body);

      assertTransformsNodesResponseBody(body);
    });

    it('should not return the number of available transform nodes for an unauthorized user', async () => {
      const { body, status } = await supertest
        .get('/api/transform/transforms/_nodes')
        .auth(
          USER.TRANSFORM_UNAUTHORIZED,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_UNAUTHORIZED)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send();
      transform.api.assertResponseStatusCode(403, status, body);
    });
  });
};

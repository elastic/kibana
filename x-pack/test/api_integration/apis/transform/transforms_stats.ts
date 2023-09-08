/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { GetTransformsStatsResponseSchema } from '@kbn/transform-plugin/common/api_schemas/transforms_stats';
import { TRANSFORM_STATE } from '@kbn/transform-plugin/common/constants';

import { getCommonRequestHeader } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { generateTransformConfig } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  const expected = {
    apiTransformTransforms: {
      count: 2,
      transform1: { id: 'transform-test-stats-1', state: TRANSFORM_STATE.STOPPED },
      transform2: { id: 'transform-test-stats-2', state: TRANSFORM_STATE.STOPPED },
      typeOfStats: 'object',
      typeOfCheckpointing: 'object',
    },
  };

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId);
    await transform.api.createTransform(transformId, config);
  }

  function assertTransformsStatsResponseBody(body: GetTransformsStatsResponseSchema) {
    expect(body.count).to.eql(expected.apiTransformTransforms.count);
    expect(body.transforms).to.have.length(expected.apiTransformTransforms.count);

    const transform1 = body.transforms[0];
    expect(transform1.id).to.eql(expected.apiTransformTransforms.transform1.id);
    expect(transform1.state).to.eql(expected.apiTransformTransforms.transform1.state);
    expect(typeof transform1.stats).to.eql(expected.apiTransformTransforms.typeOfStats);
    expect(typeof transform1.checkpointing).to.eql(
      expected.apiTransformTransforms.typeOfCheckpointing
    );

    const transform2 = body.transforms[1];
    expect(transform2.id).to.eql(expected.apiTransformTransforms.transform2.id);
    expect(transform2.state).to.eql(expected.apiTransformTransforms.transform2.state);
    expect(typeof transform2.stats).to.eql(expected.apiTransformTransforms.typeOfStats);
    expect(typeof transform2.checkpointing).to.eql(
      expected.apiTransformTransforms.typeOfCheckpointing
    );
  }

  describe('/internal/transform/transforms/_stats', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await createTransform('transform-test-stats-1');
      await createTransform('transform-test-stats-2');
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    it('should return a list of transforms statistics for super-user', async () => {
      const { body, status } = await supertest
        .get('/internal/transform/transforms/_stats')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(getCommonRequestHeader('1'))
        .send();
      transform.api.assertResponseStatusCode(200, status, body);

      assertTransformsStatsResponseBody(body);
    });

    it('should return a list of transforms statistics view-only user', async () => {
      const { body, status } = await supertest
        .get(`/internal/transform/transforms/_stats`)
        .auth(
          USER.TRANSFORM_VIEWER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
        )
        .set(getCommonRequestHeader('1'))
        .send();
      transform.api.assertResponseStatusCode(200, status, body);

      assertTransformsStatsResponseBody(body);
    });
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { GetTransformsStatsResponseSchema } from '@kbn/transform-plugin/common/api_schemas/transforms_stats';
import { TRANSFORM_STATE, type TransformState } from '@kbn/transform-plugin/common/constants';

import { getCommonRequestHeader } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { FtrProviderContext } from '../../ftr_provider_context';

import { generateTransformConfig } from './common';

interface ExpectedTransformsStats {
  id: string;
  state: TransformState;
}

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  async function superTestRequest(endpoint: string, user: USER) {
    return await supertest
      .get(endpoint)
      .auth(user, transform.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'))
      .send();
  }

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId);
    await transform.api.createTransform(transformId, config);
  }

  function assertTransformsStatsResponseBody(
    body: GetTransformsStatsResponseSchema,
    expectedTransformsStats: ExpectedTransformsStats[]
  ) {
    const expectedTransformsCount = expectedTransformsStats.length;

    expect(body.count).to.eql(
      expectedTransformsCount,
      `Expected response body count attribute to be ${expectedTransformsCount} (got ${body.count})`
    );
    expect(body.transforms).to.have.length(
      expectedTransformsCount,
      `Expected response body transforms count to be ${expectedTransformsCount} (got ${body.transforms.length})`
    );

    expectedTransformsStats.forEach((expected, index) => {
      const transformStats = body.transforms[index];
      expect(transformStats.id).to.eql(
        expected.id,
        `Expected transforms id to be ${expected.id} (got ${transformStats.id})`
      );
      expect(transformStats.state).to.eql(
        expected.state,
        `Expected transforms state to be ${expected.state} (got ${transformStats.state})`
      );
      expect(typeof transformStats.stats).to.eql(
        'object',
        `Expected transforms stats type to be 'object' (got ${typeof transformStats.stats})`
      );
      expect(typeof transformStats.checkpointing).to.eql(
        'object',
        `Expected transforms checkpointing type to be 'object' (got ${typeof transformStats.checkpointing})`
      );
    });
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
      const { body, status } = await superTestRequest(
        '/internal/transform/transforms/_stats',
        USER.TRANSFORM_POWERUSER
      );

      transform.api.assertResponseStatusCode(200, status, body);

      assertTransformsStatsResponseBody(body, [
        { id: 'transform-test-stats-1', state: TRANSFORM_STATE.STOPPED },
        { id: 'transform-test-stats-2', state: TRANSFORM_STATE.STOPPED },
      ]);
    });

    it('should return statistics for a single transform for super-user', async () => {
      const { body, status } = await superTestRequest(
        '/internal/transform/transforms/transform-test-stats-1/_stats',
        USER.TRANSFORM_POWERUSER
      );

      transform.api.assertResponseStatusCode(200, status, body);

      assertTransformsStatsResponseBody(body, [
        { id: 'transform-test-stats-1', state: TRANSFORM_STATE.STOPPED },
      ]);
    });

    it('should return a list of transforms statistics view-only user', async () => {
      const { body, status } = await superTestRequest(
        '/internal/transform/transforms/_stats',
        USER.TRANSFORM_VIEWER
      );

      transform.api.assertResponseStatusCode(200, status, body);

      assertTransformsStatsResponseBody(body, [
        { id: 'transform-test-stats-1', state: TRANSFORM_STATE.STOPPED },
        { id: 'transform-test-stats-2', state: TRANSFORM_STATE.STOPPED },
      ]);
    });

    it('should return statistics for a single transform for view-only user', async () => {
      const { body, status } = await superTestRequest(
        '/internal/transform/transforms/transform-test-stats-2/_stats',
        USER.TRANSFORM_VIEWER
      );

      transform.api.assertResponseStatusCode(200, status, body);

      assertTransformsStatsResponseBody(body, [
        { id: 'transform-test-stats-2', state: TRANSFORM_STATE.STOPPED },
      ]);
    });
  });
};

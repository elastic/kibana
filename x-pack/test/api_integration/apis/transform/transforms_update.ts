/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { generateTransformConfig } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  const expected = {
    transformOriginalConfig: {
      count: 1,
      id: 'transform-test-update-1',
      source: {
        index: ['ft_farequote'],
        query: { match_all: {} },
      },
    },
    apiTransformTransformsPreview: {
      previewItemCount: 19,
      typeOfGeneratedDestIndex: 'object',
    },
  };

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId);
    await transform.api.createTransform(transformId, config);
  }

  function getTransformUpdateConfig() {
    return {
      source: {
        index: 'ft_*',
        query: {
          term: {
            airline: {
              value: 'AAL',
            },
          },
        },
      },
      description: 'the-updated-description',
      dest: {
        index: 'user-the-updated-destination-index',
      },
      frequency: '60m',
    };
  }

  describe('/api/transform/transforms/{transformId}/_update', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await createTransform('transform-test-update-1');
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    it('should update a transform', async () => {
      // assert the original transform for comparison
      const { body: transformOriginalBody, status: transformOriginalStatus } = await supertest
        .get('/api/transform/transforms/transform-test-update-1')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send();
      transform.api.assertResponseStatusCode(200, transformOriginalStatus, transformOriginalBody);

      expect(transformOriginalBody.count).to.eql(expected.transformOriginalConfig.count);
      expect(transformOriginalBody.transforms).to.have.length(
        expected.transformOriginalConfig.count
      );

      const transformOriginalConfig = transformOriginalBody.transforms[0];
      expect(transformOriginalConfig.id).to.eql(expected.transformOriginalConfig.id);
      expect(transformOriginalConfig.source).to.eql(expected.transformOriginalConfig.source);
      expect(transformOriginalConfig.description).to.eql(undefined);
      expect(transformOriginalConfig.settings).to.eql({});

      // update the transform and assert the response
      const { body: transformUpdateResponseBody, status: transformUpdatedResponseStatus } =
        await supertest
          .post('/api/transform/transforms/transform-test-update-1/_update')
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send(getTransformUpdateConfig());
      transform.api.assertResponseStatusCode(
        200,
        transformUpdatedResponseStatus,
        transformUpdateResponseBody
      );

      const expectedUpdateConfig = getTransformUpdateConfig();
      expect(transformUpdateResponseBody.id).to.eql(expected.transformOriginalConfig.id);
      expect(transformUpdateResponseBody.source).to.eql({
        ...expectedUpdateConfig.source,
        index: ['ft_*'],
      });
      expect(transformUpdateResponseBody.description).to.eql(expectedUpdateConfig.description);
      expect(transformUpdateResponseBody.settings).to.eql({});

      // assert the updated transform for comparison
      const { body: transformUpdatedBody, status: transformUpdatedStatus } = await supertest
        .get('/api/transform/transforms/transform-test-update-1')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send();
      transform.api.assertResponseStatusCode(200, transformUpdatedStatus, transformUpdatedBody);

      expect(transformUpdatedBody.count).to.eql(expected.transformOriginalConfig.count);
      expect(transformUpdatedBody.transforms).to.have.length(
        expected.transformOriginalConfig.count
      );

      const transformUpdatedConfig = transformUpdatedBody.transforms[0];
      expect(transformUpdatedConfig.id).to.eql(expected.transformOriginalConfig.id);
      expect(transformUpdatedConfig.source).to.eql({
        ...expectedUpdateConfig.source,
        index: ['ft_*'],
      });
      expect(transformUpdatedConfig.description).to.eql(expectedUpdateConfig.description);
      expect(transformUpdatedConfig.settings).to.eql({});
    });

    it('should return 403 for transform view-only user', async () => {
      const { body, status } = await supertest
        .post('/api/transform/transforms/transform-test-update-1/_update')
        .auth(
          USER.TRANSFORM_VIEWER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send(getTransformUpdateConfig());
      transform.api.assertResponseStatusCode(403, status, body);
    });
  });
};

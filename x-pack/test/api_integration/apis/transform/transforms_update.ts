/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      id: 'the-transform-1',
      source: {
        index: ['farequote-*'],
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
    await transform.api.createTransform(config);
  }

  function getTransformUpdateConfig() {
    return {
      source: {
        index: 'farequote-2*',
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
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await createTransform('the-transform-1');
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    it('should update a transform', async () => {
      // assert the original transform for comparison
      const { body: transformOriginalBody } = await supertest
        .get('/api/transform/transforms/the-transform-1')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send()
        .expect(200);

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
      const { body: transformUpdateResponseBody } = await supertest
        .post('/api/transform/transforms/the-transform-1/_update')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send(getTransformUpdateConfig())
        .expect(200);

      const expectedUpdateConfig = getTransformUpdateConfig();
      expect(transformUpdateResponseBody.id).to.eql(expected.transformOriginalConfig.id);
      expect(transformUpdateResponseBody.source).to.eql({
        ...expectedUpdateConfig.source,
        index: ['farequote-2*'],
      });
      expect(transformUpdateResponseBody.description).to.eql(expectedUpdateConfig.description);
      expect(transformUpdateResponseBody.settings).to.eql({});

      // assert the updated transform for comparison
      const { body: transformUpdatedBody } = await supertest
        .get('/api/transform/transforms/the-transform-1')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send()
        .expect(200);

      expect(transformUpdatedBody.count).to.eql(expected.transformOriginalConfig.count);
      expect(transformUpdatedBody.transforms).to.have.length(
        expected.transformOriginalConfig.count
      );

      const transformUpdatedConfig = transformUpdatedBody.transforms[0];
      expect(transformUpdatedConfig.id).to.eql(expected.transformOriginalConfig.id);
      expect(transformUpdatedConfig.source).to.eql({
        ...expectedUpdateConfig.source,
        index: ['farequote-2*'],
      });
      expect(transformUpdatedConfig.description).to.eql(expectedUpdateConfig.description);
      expect(transformUpdatedConfig.settings).to.eql({});
    });

    it('should return 403 for transform view-only user', async () => {
      await supertest
        .post('/api/transform/transforms/the-transform-1/_update')
        .auth(
          USER.TRANSFORM_VIEWER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send(getTransformUpdateConfig())
        .expect(403);
    });
  });
};

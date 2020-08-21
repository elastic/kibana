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
    apiTransformTransforms: {
      count: 2,
      transform1: { id: 'the-transform-1', state: 'stopped' },
      transform2: { id: 'the-transform-2', state: 'stopped' },
      typeOfStats: 'object',
      typeOfCheckpointing: 'object',
    },
  };

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId);
    await transform.api.createTransform(transformId, config);
  }

  describe('/api/transform/transforms/_stats', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await createTransform('the-transform-1');
      await createTransform('the-transform-2');
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    it('should return a list of transforms statistics', async () => {
      const { body } = await supertest
        .get('/api/transform/transforms/_stats')
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send()
        .expect(200);

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
    });

    it('should return 200 for transform view-only user', async () => {
      await supertest
        .get(`/api/transform/transforms/_stats`)
        .auth(
          USER.TRANSFORM_VIEWER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send()
        .expect(200);
    });
  });
};

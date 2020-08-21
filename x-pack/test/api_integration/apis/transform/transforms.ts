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
      transform1: { id: 'the-transform-1', destIndex: 'user-the-transform-1' },
      transform2: { id: 'the-transform-2', destIndex: 'user-the-transform-2' },
      typeOfVersion: 'string',
      typeOfCreateTime: 'number',
    },
    apiTransformTransformsTransformId: {
      count: 1,
      transform1: { id: 'the-transform-1', destIndex: 'user-the-transform-1' },
      typeOfVersion: 'string',
      typeOfCreateTime: 'number',
    },
  };

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId);
    await transform.api.createTransform(config);
  }

  describe('/api/transform/transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await createTransform('the-transform-1');
      await createTransform('the-transform-2');
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    describe('/transforms', function () {
      it('should return a list of transforms', async () => {
        const { body } = await supertest
          .get('/api/transform/transforms')
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
        expect(transform1.dest.index).to.eql(expected.apiTransformTransforms.transform1.destIndex);
        expect(typeof transform1.version).to.eql(expected.apiTransformTransforms.typeOfVersion);
        expect(typeof transform1.create_time).to.eql(
          expected.apiTransformTransforms.typeOfCreateTime
        );

        const transform2 = body.transforms[1];
        expect(transform2.id).to.eql(expected.apiTransformTransforms.transform2.id);
        expect(transform2.dest.index).to.eql(expected.apiTransformTransforms.transform2.destIndex);
        expect(typeof transform2.version).to.eql(expected.apiTransformTransforms.typeOfVersion);
        expect(typeof transform2.create_time).to.eql(
          expected.apiTransformTransforms.typeOfCreateTime
        );
      });

      it('should return 200 for transform view-only user', async () => {
        await supertest
          .get(`/api/transform/transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send()
          .expect(200);
      });
    });

    describe('/transforms/{transformId}', function () {
      it('should return a specific transform configuration', async () => {
        const { body } = await supertest
          .get('/api/transform/transforms/the-transform-1')
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send()
          .expect(200);

        expect(body.count).to.eql(expected.apiTransformTransformsTransformId.count);
        expect(body.transforms).to.have.length(expected.apiTransformTransformsTransformId.count);

        const transform1 = body.transforms[0];
        expect(transform1.id).to.eql(expected.apiTransformTransformsTransformId.transform1.id);
        expect(transform1.dest.index).to.eql(
          expected.apiTransformTransformsTransformId.transform1.destIndex
        );
        expect(typeof transform1.version).to.eql(
          expected.apiTransformTransformsTransformId.typeOfVersion
        );
        expect(typeof transform1.create_time).to.eql(
          expected.apiTransformTransformsTransformId.typeOfCreateTime
        );
      });

      it('should return 200 for transform view-only user', async () => {
        await supertest
          .get(`/api/transform/transforms/the-transform-1`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send()
          .expect(200);
      });
    });
  });
};

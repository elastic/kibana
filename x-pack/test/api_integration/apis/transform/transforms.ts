/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common';
import { USER } from '../../../functional/services/transform/security_common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  const expected = {
    count: 2,
    transform1: { id: 'the-transform-1', destIndex: 'user-the-transform-1' },
    transform2: { id: 'the-transform-2', destIndex: 'user-the-transform-2' },
    typeOfVersion: 'string',
    typeOfCreateTime: 'number',
  };

  function generateDestIndex(transformId: string): string {
    return `user-${transformId}`;
  }

  async function createTransform(transformId: string, destinationIndex: string) {
    const config = {
      id: transformId,
      source: { index: ['farequote-*'] },
      pivot: {
        group_by: { airline: { terms: { field: 'airline' } } },
        aggregations: { '@timestamp.value_count': { value_count: { field: '@timestamp' } } },
      },
      dest: { index: destinationIndex },
    };

    await transform.api.createTransform(config);
  }

  describe('/api/transform/transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await createTransform('the-transform-1', generateDestIndex('the-transform-1'));
      await createTransform('the-transform-2', generateDestIndex('the-transform-2'));
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
      // await transform.api.cleanTransforms();
    });

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

      expect(body.count).to.eql(expected.count);
      expect(body.transforms).to.have.length(expected.count);

      const transform1 = body.transforms[0];
      expect(transform1.id).to.eql(expected.transform1.id);
      expect(transform1.dest.index).to.eql(expected.transform1.destIndex);
      expect(typeof transform1.version).to.eql(expected.typeOfVersion);
      expect(typeof transform1.create_time).to.eql(expected.typeOfCreateTime);

      const transform2 = body.transforms[1];
      expect(transform2.id).to.eql(expected.transform2.id);
      expect(transform2.dest.index).to.eql(expected.transform2.destIndex);
      expect(typeof transform2.version).to.eql(expected.typeOfVersion);
      expect(typeof transform2.create_time).to.eql(expected.typeOfCreateTime);
    });

    it('should return 200 for tranform view-only user', async () => {
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
};

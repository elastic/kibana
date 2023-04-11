/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { GetTransformsResponseSchema } from '../../../../plugins/transform/common/api_schemas/transforms';
import { isGetTransformsResponseSchema } from '../../../../plugins/transform/common/api_schemas/type_guards';
import { COMMON_REQUEST_HEADERS } from '../../../functional/services/ml/common_api';
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
      transform1: { id: 'transform-test-get-1', destIndex: 'user-transform-test-get-1' },
      transform2: { id: 'transform-test-get-2', destIndex: 'user-transform-test-get-2' },
      typeOfVersion: 'string',
      typeOfCreateTime: 'number',
    },
    apiTransformTransformsTransformId: {
      count: 1,
      transform1: { id: 'transform-test-get-1', destIndex: 'user-transform-test-get-1' },
      typeOfVersion: 'string',
      typeOfCreateTime: 'number',
    },
  };

  async function createTransform(transformId: string) {
    const config = generateTransformConfig(transformId);
    await transform.api.createTransform(transformId, config);
  }

  function assertTransformsResponseBody(body: GetTransformsResponseSchema) {
    expect(isGetTransformsResponseSchema(body)).to.eql(true);

    expect(body.count).to.eql(expected.apiTransformTransforms.count);
    expect(body.transforms).to.have.length(expected.apiTransformTransforms.count);

    const transform1 = body.transforms[0];
    expect(transform1.id).to.eql(expected.apiTransformTransforms.transform1.id);
    expect(transform1.dest.index).to.eql(expected.apiTransformTransforms.transform1.destIndex);
    expect(typeof transform1.version).to.eql(expected.apiTransformTransforms.typeOfVersion);
    expect(typeof transform1.create_time).to.eql(expected.apiTransformTransforms.typeOfCreateTime);

    const transform2 = body.transforms[1];
    expect(transform2.id).to.eql(expected.apiTransformTransforms.transform2.id);
    expect(transform2.dest.index).to.eql(expected.apiTransformTransforms.transform2.destIndex);
    expect(typeof transform2.version).to.eql(expected.apiTransformTransforms.typeOfVersion);
    expect(typeof transform2.create_time).to.eql(expected.apiTransformTransforms.typeOfCreateTime);
  }

  function assertSingleTransformResponseBody(body: GetTransformsResponseSchema) {
    expect(isGetTransformsResponseSchema(body)).to.eql(true);

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
  }

  describe('/api/transform/transforms', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
      await createTransform('transform-test-get-1');
      await createTransform('transform-test-get-2');
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    describe('/transforms', function () {
      it('should return a list of transforms for super-user', async () => {
        const { body, status } = await supertest
          .get('/api/transform/transforms')
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send();
        transform.api.assertResponseStatusCode(200, status, body);

        assertTransformsResponseBody(body);
      });

      it('should return a list of transforms for transform view-only user', async () => {
        const { body, status } = await supertest
          .get(`/api/transform/transforms`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send();
        transform.api.assertResponseStatusCode(200, status, body);

        assertTransformsResponseBody(body);
      });
    });

    describe('/transforms/{transformId}', function () {
      it('should return a specific transform configuration for super-user', async () => {
        const { body, status } = await supertest
          .get('/api/transform/transforms/transform-test-get-1')
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send();
        transform.api.assertResponseStatusCode(200, status, body);

        assertSingleTransformResponseBody(body);
      });

      it('should return a specific transform configuration transform view-only user', async () => {
        const { body, status } = await supertest
          .get(`/api/transform/transforms/transform-test-get-1`)
          .auth(
            USER.TRANSFORM_VIEWER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_VIEWER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send();
        transform.api.assertResponseStatusCode(200, status, body);

        assertSingleTransformResponseBody(body);
      });

      it('should report 404 for a non-existing transform', async () => {
        const { body, status } = await supertest
          .get('/api/transform/transforms/the-non-existing-transform')
          .auth(
            USER.TRANSFORM_POWERUSER,
            transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
          )
          .set(COMMON_REQUEST_HEADERS)
          .send();
        transform.api.assertResponseStatusCode(404, status, body);
      });
    });
  });
};

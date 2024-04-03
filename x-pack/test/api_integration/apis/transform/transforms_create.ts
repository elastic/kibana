/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../functional/services/ml/common_api';
import { USER } from '../../../functional/services/transform/security_common';

import { generateTransformConfig, generateDestIndex } from './common';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const transform = getService('transform');

  describe('/internal/transform/transforms/{transformId}/ create', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    it('should create a transform', async () => {
      const transformId = 'test_transform_id_create';

      const { body, status } = await supertest
        .put(`/internal/transform/transforms/${transformId}`)
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(getCommonRequestHeader('1'))
        .send({
          ...generateTransformConfig(transformId),
        });

      transform.api.assertResponseStatusCode(200, status, body);

      expect(body).to.eql({
        dataViewsCreated: [],
        dataViewsErrors: [],
        errors: [],
        transformsCreated: [
          {
            transform: transformId,
          },
        ],
      });
    });

    it('should create a transform with data view', async () => {
      const transformId = 'test_transform_id_create_with_data_view';
      const destinationIndex = generateDestIndex(transformId);

      const { body, status } = await supertest
        .put(`/internal/transform/transforms/${transformId}?createDataView=true`)
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(getCommonRequestHeader('1'))
        .send({
          ...generateTransformConfig(transformId),
        });

      transform.api.assertResponseStatusCode(200, status, body);

      // The data view id will be returned as a non-deterministic uuid
      // so we cannot assert the actual id returned. We'll just assert
      // that a data view has been created a no errors were returned.
      expect(body.dataViewsCreated.length).to.be(1);
      expect(body.dataViewsErrors.length).to.be(0);
      expect(body.errors.length).to.be(0);
      expect(body.transformsCreated).to.eql([
        {
          transform: transformId,
        },
      ]);

      await transform.testResources.deleteDataViewByTitle(destinationIndex);
    });

    it('should create a transform with data view and time field', async () => {
      const transformId = 'test_transform_id_create_with_data_view_and_time_field';
      const destinationIndex = generateDestIndex(transformId);

      const { body, status } = await supertest
        .put(
          `/internal/transform/transforms/${transformId}?createDataView=true&timeFieldName=@timestamp`
        )
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(getCommonRequestHeader('1'))
        .send({
          ...generateTransformConfig(transformId),
        });

      transform.api.assertResponseStatusCode(200, status, body);

      // The data view id will be returned as a non-deterministic uuid
      // so we cannot assert the actual id returned. We'll just assert
      // that a data view has been created a no errors were returned.
      expect(body.dataViewsCreated.length).to.be(1);
      expect(body.dataViewsErrors.length).to.be(0);
      expect(body.errors.length).to.be(0);
      expect(body.transformsCreated).to.eql([
        {
          transform: transformId,
        },
      ]);

      await transform.testResources.deleteDataViewByTitle(destinationIndex);
    });

    it('should not allow pivot and latest configs in same transform', async () => {
      const transformId = 'test_transform_id_fail';

      const { body, status } = await supertest
        .put(`/internal/transform/transforms/${transformId}`)
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(getCommonRequestHeader('1'))
        .send({
          ...generateTransformConfig(transformId),
          latest: {
            unique_key: ['country', 'gender'],
            sort: 'infected',
          },
        });
      transform.api.assertResponseStatusCode(400, status, body);

      expect(body.message).to.eql('[request body]: pivot and latest are not allowed together');
    });

    it('should ensure if pivot or latest is provided', async () => {
      const transformId = 'test_transform_id_fail';

      const { pivot, ...config } = generateTransformConfig(transformId);

      const { body, status } = await supertest
        .put(`/internal/transform/transforms/${transformId}`)
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(getCommonRequestHeader('1'))
        .send(config);
      transform.api.assertResponseStatusCode(400, status, body);

      expect(body.message).to.eql(
        '[request body]: pivot or latest is required for transform configuration'
      );
    });
  });
};

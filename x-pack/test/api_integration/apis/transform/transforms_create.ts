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

  describe('/api/transform/transforms/{transformId}/ create', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await transform.testResources.setKibanaTimeZoneToUTC();
    });

    after(async () => {
      await transform.api.cleanTransformIndices();
    });

    it('should not allow pivot and latest configs in same transform', async () => {
      const transformId = 'test_transform_id';

      const { body, status } = await supertest
        .put(`/api/transform/transforms/${transformId}`)
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
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
      const transformId = 'test_transform_id';

      const { pivot, ...config } = generateTransformConfig(transformId);

      const { body, status } = await supertest
        .put(`/api/transform/transforms/${transformId}`)
        .auth(
          USER.TRANSFORM_POWERUSER,
          transform.securityCommon.getPasswordForUser(USER.TRANSFORM_POWERUSER)
        )
        .set(COMMON_REQUEST_HEADERS)
        .send(config);
      transform.api.assertResponseStatusCode(400, status, body);

      expect(body.message).to.eql(
        '[request body]: pivot or latest is required for transform configuration'
      );
    });
  });
};

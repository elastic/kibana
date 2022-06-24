/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const validFilters = [
    {
      filterId: 'filter_1',
      requestBody: { description: 'Valid filter #1', items: ['104.236.210.185'] },
    },
    {
      filterId: 'filter_2',
      requestBody: { description: 'Valid filter #2', items: ['104.236.210.185'] },
    },
  ];

  describe('get_filters', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      for (const filter of validFilters) {
        const { filterId, requestBody } = filter;
        await ml.api.createFilter(filterId, requestBody);
      }
    });

    after(async () => {
      for (const filter of validFilters) {
        const { filterId } = filter;
        await ml.api.deleteFilter(filterId);
      }
    });

    it(`should fetch all filters`, async () => {
      const { body, status } = await supertest
        .get(`/api/ml/filters`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body).to.have.length(validFilters.length);
    });

    it(`should not allow to retrieve filters for user without required permission`, async () => {
      const { body, status } = await supertest
        .get(`/api/ml/filters`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');
    });

    it(`should not allow to retrieve filters for unauthorized user`, async () => {
      const { body, status } = await supertest
        .get(`/api/ml/filters`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      expect(body.message).to.eql('Forbidden');
    });

    it(`should fetch single filter by id`, async () => {
      const { filterId, requestBody } = validFilters[0];
      const { body, status } = await supertest
        .get(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.filter_id).to.eql(filterId);
      expect(body.description).to.eql(requestBody.description);
      expect(body.items).to.eql(requestBody.items);
    });

    it(`should return 404 if filterId does not exist`, async () => {
      const { body, status } = await supertest
        .get(`/api/ml/filters/filter_id_dne`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(404, status, body);

      expect(body.error).to.eql('Not Found');
      expect(body.message).to.contain('resource_not_found_exception');
    });
  });
};

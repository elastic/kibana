/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      const { body } = await supertest
        .get(`/api/ml/filters`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body).to.have.length(validFilters.length);
    });

    it(`should not allow to retrieve filters for user without required permission`, async () => {
      const { body } = await supertest
        .get(`/api/ml/filters`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(404);
      expect(body.error).to.eql('Not Found');
      expect(body.message).to.eql('Not Found');
    });

    it(`should not allow to retrieve filters for unauthorized user`, async () => {
      const { body } = await supertest
        .get(`/api/ml/filters`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .expect(404);

      expect(body.error).to.eql('Not Found');
      expect(body.message).to.eql('Not Found');
    });

    it(`should fetch single filter by id`, async () => {
      const { filterId, requestBody } = validFilters[0];
      const { body } = await supertest
        .get(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(200);

      expect(body.filter_id).to.eql(filterId);
      expect(body.description).to.eql(requestBody.description);
      expect(body.items).to.eql(requestBody.items);
    });

    it(`should return 400 if filterId does not exist`, async () => {
      const { body } = await supertest
        .get(`/api/ml/filters/filter_id_dne`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .expect(400);
      expect(body.error).to.eql('Bad Request');
      expect(body.message).to.contain('Unable to find filter');
    });
  });
};

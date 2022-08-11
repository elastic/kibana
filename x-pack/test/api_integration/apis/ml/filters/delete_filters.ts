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

  const items = ['104.236.210.185'];
  const validFilters = [
    {
      filterId: 'filter_power',
      requestBody: { description: 'Test delete filter #1', items },
    },
    {
      filterId: 'filter_viewer',
      requestBody: { description: 'Test delete filter (viewer)', items },
    },
    {
      filterId: 'filter_unauthorized',
      requestBody: { description: 'Test delete filter (unauthorized)', items },
    },
  ];

  describe('delete_filters', function () {
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

    it(`should delete filter by id`, async () => {
      const { filterId } = validFilters[0];
      const { body, status } = await supertest
        .delete(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.acknowledged).to.eql(true);
      await ml.api.waitForFilterToNotExist(filterId);
    });

    it(`should not delete filter for user without required permission`, async () => {
      const { filterId } = validFilters[1];
      const { body, status } = await supertest
        .delete(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      await ml.api.waitForFilterToExist(filterId);
    });

    it(`should not delete filter for unauthorized user`, async () => {
      const { filterId } = validFilters[2];
      const { body, status } = await supertest
        .delete(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');
      await ml.api.waitForFilterToExist(filterId);
    });

    it(`should not allow user to delete filter if invalid filterId`, async () => {
      const { body, status } = await supertest
        .delete(`/api/ml/filters/filter_id_dne`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS);
      ml.api.assertResponseStatusCode(404, status, body);

      expect(body.error).to.eql('Not Found');
    });
  });
};

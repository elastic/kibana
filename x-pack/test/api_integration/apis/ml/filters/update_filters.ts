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
      requestBody: { description: 'Test update filter #1', items },
    },
    {
      filterId: 'filter_viewer',
      requestBody: { description: 'Test update filter (viewer)', items },
    },
    {
      filterId: 'filter_unauthorized',
      requestBody: { description: 'Test update filter (unauthorized)', items },
    },
  ];

  describe('update_filters', function () {
    const updateFilterRequestBody = {
      description: 'Updated filter #1',
      removeItems: items,
      addItems: ['my_new_items_1', 'my_new_items_2'],
    };
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

    it(`should update filter by id`, async () => {
      const { filterId } = validFilters[0];
      const { body, status } = await supertest
        .put(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateFilterRequestBody);
      ml.api.assertResponseStatusCode(200, status, body);

      expect(body.filter_id).to.eql(filterId);
      expect(body.description).to.eql(updateFilterRequestBody.description);
      expect(body.items).to.eql(updateFilterRequestBody.addItems);
    });

    it(`should not allow to update filter for user without required permission`, async () => {
      const { filterId, requestBody: oldFilterRequest } = validFilters[1];
      const { body, status } = await supertest
        .put(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateFilterRequestBody);
      ml.api.assertResponseStatusCode(403, status, body);

      // response should return not found
      expect(body.error).to.eql('Forbidden');

      // and the filter should not be updated
      const response = await ml.api.getFilter(filterId);
      const updatedFilter = response.body.filters[0];
      expect(updatedFilter.filter_id).to.eql(filterId);
      expect(updatedFilter.description).to.eql(oldFilterRequest.description);
      expect(updatedFilter.items).to.eql(oldFilterRequest.items);
    });

    it(`should not allow to update filter for unauthorized user`, async () => {
      const { filterId, requestBody: oldFilterRequest } = validFilters[2];
      const { body, status } = await supertest
        .put(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateFilterRequestBody);
      ml.api.assertResponseStatusCode(403, status, body);

      expect(body.error).to.eql('Forbidden');

      const response = await ml.api.getFilter(filterId);
      const updatedFilter = response.body.filters[0];
      expect(updatedFilter.filter_id).to.eql(filterId);
      expect(updatedFilter.description).to.eql(oldFilterRequest.description);
      expect(updatedFilter.items).to.eql(oldFilterRequest.items);
    });

    it(`should return appropriate error if invalid filterId`, async () => {
      const { body, status } = await supertest
        .put(`/api/ml/filters/filter_id_dne`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateFilterRequestBody);
      ml.api.assertResponseStatusCode(400, status, body);

      expect(body.message).to.contain('resource_not_found_exception');
    });
  });
};

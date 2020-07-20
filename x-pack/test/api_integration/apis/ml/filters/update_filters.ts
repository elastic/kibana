/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { COMMON_REQUEST_HEADERS } from '../../../../functional/services/ml/common';

// eslint-disable-next-line import/no-default-export
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

  describe('update_filters', function () {
    const updateFilterRequest = {
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
      const { body } = await supertest
        .put(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateFilterRequest)
        .expect(200);

      expect(body.filter_id).to.eql(filterId);
      expect(body.description).to.eql(updateFilterRequest.description);
      expect(body.items).to.eql(updateFilterRequest.addItems);
    });

    it(`should not allow user to delete filter by id if no permission`, async () => {
      const { filterId } = validFilters[1];
      const { body } = await supertest
        .put(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_VIEWER, ml.securityCommon.getPasswordForUser(USER.ML_VIEWER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateFilterRequest)
        .expect(404);
      expect(body.error).to.eql('Not Found');
    });

    it(`should not allow user to delete filter by id if unauthorized`, async () => {
      const { filterId, requestBody: oldFilterRequest } = validFilters[1];
      const { body } = await supertest
        .put(`/api/ml/filters/${filterId}`)
        .auth(USER.ML_UNAUTHORIZED, ml.securityCommon.getPasswordForUser(USER.ML_UNAUTHORIZED))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateFilterRequest)
        .expect(404);

      // response should return not found
      expect(body.error).to.eql('Not Found');

      // and the filter should not be updated
      const response = await ml.api.getFilter(filterId);
      const updatedFilter = response.body.filters[0];
      expect(updatedFilter.filter_id).to.eql(filterId);
      expect(updatedFilter.description).to.eql(oldFilterRequest.description);
      expect(updatedFilter.items).to.eql(oldFilterRequest.items);
    });

    it(`should not allow user to delete filter if invalid filterId`, async () => {
      const { body } = await supertest
        .put(`/api/ml/filters/filter_id_dne`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(COMMON_REQUEST_HEADERS)
        .send(updateFilterRequest)
        .expect(400);

      expect(body.message).to.contain('No filter with id');
    });
  });
};

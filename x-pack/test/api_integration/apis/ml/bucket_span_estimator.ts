/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('bucket span estimator', () => {
    before(async () => {
      await esArchiver.load('ml/ecommerce');
    });

    after(async () => {
      await esArchiver.unload('ml/ecommerce');
    });

    it('estimates the bucket span', async () => {
      const { body } = await supertest
        .post('/api/ml/validate/estimate_bucket_span')
        .set(COMMON_HEADERS)
        .send({
          aggTypes: ['avg'],
          duration: {
            start: 1560297859000,
            end: 1562975136000,
          },
          fields: ['taxless_total_price'],
          index: 'ecommerce',
          query: {
            bool: {
              must: [
                {
                  match_all: {},
                },
              ],
            },
          },
          splitField: 'customer_first_name.keyword',
          timeField: 'order_date',
        })
        .expect(200);

      expect(body).to.eql({
        name: '3h',
        ms: 10800000,
      });
    });
  });
};

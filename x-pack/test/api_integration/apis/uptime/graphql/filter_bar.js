/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { filterBarQueryString } from '../../../../../plugins/uptime/public/queries';
import filterList from './fixtures/filter_list';

export default function ({ getService }) {
  describe('filterBar query', () => {
    const supertest = getService('supertest');

    it('returns the expected filters', async () => {
      const getFilterBarQuery = {
        operationName: 'FilterBar',
        query: filterBarQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getFilterBarQuery });
      expect(data).to.eql(filterList);
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { errorListQueryString } from '../../../../../plugins/uptime/public/queries';
import errorList from './fixtures/error_list';
import errorListFilteredById from './fixtures/error_list_filtered_by_id';
import errorListFilteredByPort from './fixtures/error_list_filtered_by_port';
import errorListFilteredByPortAndType from './fixtures/error_list_filtered_by_port_and_type';

export default function ({ getService }) {
  describe('errorList query', () => {
    const supertest = getService('supertest');

    it('returns expected error list', async () => {
      const getErrorListQuery = {
        operationName: 'ErrorList',
        query: errorListQueryString,
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
        .send({ ...getErrorListQuery });
      expect(data).to.eql(errorList);
    });

    it('returns an error list filtered by monitor id', async () => {
      const getErrorListQuery = {
        operationName: 'ErrorList',
        query: errorListQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          filters: `{"bool":{"must":[{"match":{"monitor.id":{"query":"auto-http-0X3675F89EF0612091","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getErrorListQuery });
      expect(data).to.eql(errorListFilteredById);
    });

    it('returns an error list filtered by port', async () => {
      const getErrorListQuery = {
        operationName: 'ErrorList',
        query: errorListQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          filters: `{"bool":{"must":[{"match":{"url.port":{"query":"9200","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getErrorListQuery });
      expect(data).to.eql(errorListFilteredByPort);
    });

    it('returns an error list filtered by port/type', async () => {
      const getErrorListQuery = {
        operationName: 'ErrorList',
        query: errorListQueryString,
        variables: {
          dateRangeStart: '2019-01-28T17:40:08.078Z',
          dateRangeEnd: '2019-01-28T19:00:16.078Z',
          filters:
            `{"bool":{"must":[{"match":{"url.port":{"query":"12349","operator":"and"}}},` +
            `{"match":{"monitor.type":{"query":"http","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getErrorListQuery });
      expect(data).to.eql(errorListFilteredByPortAndType);
    });
  });
}

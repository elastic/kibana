/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getErrorListQueryString } from '../../../../../plugins/uptime/public/components/queries/error_list/get_error_list';
import errorList from './fixtures/error_list';
import errorListFilteredById from './fixtures/error_list_filtered_by_id';
import errorListFilteredByPort from './fixtures/error_list_filtered_by_port';
import errorListFilteredBbyPortAndScheme from './fixtures/error_list_filtered_by_port_and_scheme';

export default function ({ getService }) {
  describe('errorList query', () => {
    const supertest = getService('supertest');

    it('returns expected error list', async () => {
      const getErrorListQuery = {
        operationName: 'ErrorList',
        query: getErrorListQueryString,
        variables: { dateRangeStart: 1547805782000, dateRangeEnd: 1547852582000 },
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
        query: getErrorListQueryString,
        variables: {
          dateRangeStart: 1547805782000,
          dateRangeEnd: 1547852582000,
          filters: `{"bool":{"must":[{"match":{"monitor.id":{"query":"http@http://localhost:12349/","operator":"and"}}}]}}`,
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
        query: getErrorListQueryString,
        variables: {
          dateRangeStart: 1547805782000,
          dateRangeEnd: 1547852582000,
          filters: `{"bool":{"must":[{"match":{"tcp.port":{"query":"80","operator":"and"}}}]}}`,
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

    it('returns an error list filtered by port/scheme', async () => {
      const getErrorListQuery = {
        operationName: 'ErrorList',
        query: getErrorListQueryString,
        variables: {
          dateRangeStart: 1547805782000,
          dateRangeEnd: 1547852582000,
          filters:
            `{"bool":{"must":[{"match":{"tcp.port":{"query":"80","operator":"and"}}},` +
            `{"match":{"monitor.scheme":{"query":"http","operator":"and"}}}]}}`,
        },
      };
      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getErrorListQuery });
      expect(data).to.eql(errorListFilteredBbyPortAndScheme);
    });
  });
}

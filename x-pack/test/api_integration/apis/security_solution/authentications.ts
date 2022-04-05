/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  AuthStackByField,
  Direction,
  UserAuthenticationsRequestOptions,
  UserAuthenticationsStrategyResponse,
  UsersQueries,
} from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

const FROM = '2000-01-01T00:00:00.000Z';
const TO = '3000-01-01T00:00:00.000Z';

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'zeek-newyork-sha-aa8df15';
const LAST_SUCCESS_SOURCE_IP = '8.42.77.171';
const TOTAL_COUNT = 3;
const EDGE_LENGTH = 1;

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  describe('authentications', () => {
    before(async () => await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/hosts'));

    after(
      async () => await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/hosts')
    );

    it('Make sure that we get Authentication data', async () => {
      const requestOptions: UserAuthenticationsRequestOptions = {
        factoryQueryType: UsersQueries.authentications,
        timerange: {
          interval: '12h',
          to: TO,
          from: FROM,
        },
        pagination: {
          activePage: 0,
          cursorStart: 0,
          fakePossibleCount: 3,
          querySize: 1,
        },
        defaultIndex: ['auditbeat-*'],
        docValueFields: [],
        stackByField: AuthStackByField.userName,
        sort: { field: 'timestamp', direction: Direction.asc },
        filterQuery: '',
      };

      const authentications = await bsearch.send<UserAuthenticationsStrategyResponse>({
        supertest,
        options: requestOptions,
        strategy: 'securitySolutionSearchStrategy',
      });

      expect(authentications.edges.length).to.be(EDGE_LENGTH);
      expect(authentications.totalCount).to.be(TOTAL_COUNT);
      expect(authentications.pageInfo.fakeTotalCount).to.equal(3);
    });

    it('Make sure that pagination is working in Authentications query', async () => {
      const requestOptions: UserAuthenticationsRequestOptions = {
        factoryQueryType: UsersQueries.authentications,
        timerange: {
          interval: '12h',
          to: TO,
          from: FROM,
        },
        pagination: {
          activePage: 2,
          cursorStart: 1,
          fakePossibleCount: 5,
          querySize: 2,
        },
        defaultIndex: ['auditbeat-*'],
        docValueFields: [],
        stackByField: AuthStackByField.userName,
        sort: { field: 'timestamp', direction: Direction.asc },
        filterQuery: '',
      };

      const authentications = await bsearch.send<UserAuthenticationsStrategyResponse>({
        supertest,
        options: requestOptions,
        strategy: 'securitySolutionSearchStrategy',
      });

      expect(authentications.edges.length).to.be(EDGE_LENGTH);
      expect(authentications.totalCount).to.be(TOTAL_COUNT);
      expect(authentications.edges[0].node.lastSuccess?.source?.ip).to.eql([
        LAST_SUCCESS_SOURCE_IP,
      ]);
      expect(authentications.edges[0].node.lastSuccess?.host?.name).to.eql([HOST_NAME]);
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  NetworkQueries,
  Direction,
  NetworkUsersFields,
  FlowTarget,
  NetworkUsersStrategyResponse,
} from '../../../../plugins/security_solution/common/search_strategy';

import { FtrProviderContext } from '../../ftr_provider_context';

const FROM = '2000-01-01T00:00:00.000Z';
const TO = '3000-01-01T00:00:00.000Z';
const IP = '0.0.0.0';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const bsearch = getService('bsearch');

  describe('Users', () => {
    describe('With auditbeat', () => {
      before(
        async () => await esArchiver.load('x-pack/test/functional/es_archives/auditbeat/users')
      );
      after(
        async () => await esArchiver.unload('x-pack/test/functional/es_archives/auditbeat/users')
      );

      it('Ensure data is returned from auditbeat', async () => {
        const users = await bsearch.send<NetworkUsersStrategyResponse>({
          supertest,
          options: {
            factoryQueryType: NetworkQueries.users,
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            defaultIndex: ['auditbeat-users'],
            docValueFields: [],
            ip: IP,
            flowTarget: FlowTarget.destination,
            sort: { field: NetworkUsersFields.name, direction: Direction.asc },
            pagination: {
              activePage: 0,
              cursorStart: 0,
              fakePossibleCount: 30,
              querySize: 10,
            },
            inspect: false,
          },
          strategy: 'securitySolutionSearchStrategy',
        });
        expect(users.edges.length).to.be(1);
        expect(users.totalCount).to.be(1);
        expect(users.edges[0].node.user?.id).to.eql(['0']);
        expect(users.edges[0].node.user?.name).to.be('root');
        expect(users.edges[0].node.user?.groupId).to.eql(['0']);
        expect(users.edges[0].node.user?.groupName).to.eql(['root']);
        expect(users.edges[0].node.user?.count).to.be(1);
      });
    });
  });
}

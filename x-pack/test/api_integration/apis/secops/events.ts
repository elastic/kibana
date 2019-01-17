/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { eventsQuery } from '../../../../plugins/secops/public/containers/events/index.gql_query';
import { GetEventsQuery } from '../../../../plugins/secops/public/graphql/types';

import { KbnTestProvider } from './types';

const eventsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('events', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get Events data', () => {
      return client
        .query<GetEventsQuery.Query>({
          query: eventsQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: 1546554465535,
              from: 1483306065535,
            },
            pagination: {
              limit: 2,
              cursor: null,
              tiebreaker: null,
            },
            sortField: {
              sortFieldId: 'timestamp',
              direction: 'descending',
            },
          },
        })
        .then(resp => {
          const events = resp.data.source.Events;
          expect(events.edges.length).to.be(2);
          expect(events.totalCount).to.be(586);
          expect(events.pageInfo.endCursor!.value).to.equal('1546510126039');
        });
    });

    it('Make sure that pagination is working in Events query', () => {
      return client
        .query<GetEventsQuery.Query>({
          query: eventsQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: 1546554465535,
              from: 1483306065535,
            },
            pagination: {
              limit: 2,
              cursor: '1546510126039',
              tiebreaker: '193',
            },
            sortField: {
              sortFieldId: 'timestamp',
              direction: 'descending',
            },
          },
        })
        .then(resp => {
          const events = resp.data.source.Events;

          expect(events.edges.length).to.be(2);
          expect(events.totalCount).to.be(586);
          expect(events.edges[0]!.node.host!.name).to.be('siem-kibana');
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default eventsTests;

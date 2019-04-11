/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { eventsQuery } from '../../../../plugins/siem/public/containers/events/index.gql_query';
import { Direction, GetEventsQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

// typical values that have to change after an update from "scripts/es_archiver"
const HOST_NAME = 'suricata-sensor-amsterdam';
const TOTAL_COUNT = 1748;
const EDGE_LENGTH = 2;
const CURSOR_ID = '1550608953561';

const eventsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

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
              to: TO,
              from: FROM,
            },
            pagination: {
              limit: 2,
              cursor: null,
              tiebreaker: null,
            },
            sortField: {
              sortFieldId: 'timestamp',
              direction: Direction.desc,
            },
          },
        })
        .then(resp => {
          const events = resp.data.source.Events;
          expect(events.edges.length).to.be(EDGE_LENGTH);
          expect(events.totalCount).to.be(TOTAL_COUNT);
          expect(events.pageInfo.endCursor!.value).to.equal(CURSOR_ID);
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
              to: TO,
              from: FROM,
            },
            pagination: {
              limit: 2,
              cursor: CURSOR_ID,
              tiebreaker: '193',
            },
            sortField: {
              sortFieldId: 'timestamp',
              direction: Direction.desc,
            },
          },
        })
        .then(resp => {
          const events = resp.data.source.Events;

          expect(events.edges.length).to.be(EDGE_LENGTH);
          expect(events.totalCount).to.be(TOTAL_COUNT);
          expect(events.edges[0]!.node.host!.name).to.be(HOST_NAME);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default eventsTests;

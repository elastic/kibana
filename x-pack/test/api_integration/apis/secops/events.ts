/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

import { eventsQuery } from '../../../../plugins/secops/public/containers/events/index.gql_query';
import { GetEventsQuery } from '../../../../plugins/secops/public/graphql/types';
import { KbnTestProvider } from './types';

// typical values that have to change after an update from "scripts/es_archiver"
const FROM = new Date('2019-02-19T00:00:00.000Z').valueOf();
const TO = new Date('2019-02-19T20:00:00.000Z').valueOf();
const HOST_NAME = 'suricata-sensor-amsterdam';
const TOTAL_COUNT = 1499;
const EDGE_LENGTH = 2;
const CURSOR_ID = '1550605015376';

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
              direction: 'descending',
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
              direction: 'descending',
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

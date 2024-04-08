/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  PROCESS_EVENTS_ROUTE,
  CURRENT_API_VERSION,
} from '@kbn/session-view-plugin/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { User } from '../../../rule_registry/common/lib/authentication/types';

const MOCK_PAGE_SIZE = 400;
const ALERTS_IN_FIRST_PAGE = 8;

// Only events where event.action IN fork, exec, end
// There are a number of uid_change, session_id_change events in the mock data
// which session view does not use atm.
const MOCK_TOTAL_PROCESS_EVENTS = 419;

import {
  superUser,
  globalRead,
  secOnlyReadSpacesAll,
  obsOnlySpacesAll,
  noKibanaPrivileges,
} from '../../../rule_registry/common/lib/authentication/users';

const MOCK_INDEX = 'logs-endpoint.events.process*';
const MOCK_SESSION_START_TIME = '2022-05-08T13:44:00.13Z';
const MOCK_SESSION_ENTITY_ID =
  'MDEwMTAxMDEtMDEwMS0wMTAxLTAxMDEtMDEwMTAxMDEwMTAxLTUyMDU3LTEzMjk2NDkxMDQwLjEzMDAwMDAwMA==';

interface TestCase {
  /** The ID of the alert */
  authorizedUsers: User[];
  /** Unauthorized users */
  unauthorizedUsers: User[];
}

// eslint-disable-next-line import/no-default-export
export default function processEventsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');

  function getTestRoute() {
    return supertest
      .get(PROCESS_EVENTS_ROUTE)
      .set('kbn-xsrf', 'foo')
      .set('Elastic-Api-Version', CURRENT_API_VERSION);
  }

  describe(`Session view - ${PROCESS_EVENTS_ROUTE} - with a basic license`, () => {
    describe(`using typical process event data`, () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/session_view/process_events');
        await esArchiver.load('x-pack/test/functional/es_archives/session_view/alerts');
        await esArchiver.load('x-pack/test/functional/es_archives/session_view/io_events');
      });

      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/session_view/process_events');
        await esArchiver.unload('x-pack/test/functional/es_archives/session_view/alerts');
        await esArchiver.unload('x-pack/test/functional/es_archives/session_view/io_events');
      });

      it(`${PROCESS_EVENTS_ROUTE} fails when an invalid api version is specified`, async () => {
        const response = await supertest
          .get(PROCESS_EVENTS_ROUTE)
          .set('kbn-xsrf', 'foo')
          .set('Elastic-Api-Version', '999999')
          .query({
            index: MOCK_INDEX,
            sessionEntityId: MOCK_SESSION_ENTITY_ID,
            sessionStartTime: MOCK_SESSION_START_TIME,
          });
        expect(response.status).to.be(400);
      });

      it(`${PROCESS_EVENTS_ROUTE} returns a page of process events`, async () => {
        const response = await getTestRoute().query({
          index: MOCK_INDEX,
          sessionEntityId: MOCK_SESSION_ENTITY_ID,
          sessionStartTime: MOCK_SESSION_START_TIME,
          pageSize: MOCK_PAGE_SIZE, // overriding to test pagination, as we only have 419 records of mock data
        });
        expect(response.status).to.be(200);
        expect(response.body.total).to.be(MOCK_TOTAL_PROCESS_EVENTS);
        expect(response.body.events.length).to.be(MOCK_PAGE_SIZE + ALERTS_IN_FIRST_PAGE);
      });

      it(`${PROCESS_EVENTS_ROUTE} returns a page of process events (w alerts) (paging forward)`, async () => {
        const response = await getTestRoute().query({
          index: MOCK_INDEX,
          sessionEntityId: MOCK_SESSION_ENTITY_ID,
          sessionStartTime: MOCK_SESSION_START_TIME,
          pageSize: MOCK_PAGE_SIZE, // overriding to test pagination, as we only have 419 records of mock data
          cursor: '2022-05-10T20:39:23.6817084Z', // paginating from the timestamp of the first alert.
        });
        expect(response.status).to.be(200);

        const alerts = response.body.events.filter(
          (event: any) => event._source.event.kind === 'signal'
        );

        expect(alerts.length).to.above(0);
      });

      it(`${PROCESS_EVENTS_ROUTE} returns a page of process events (w alerts) (paging backwards)`, async () => {
        const response = await getTestRoute().query({
          index: MOCK_INDEX,
          sessionEntityId: MOCK_SESSION_ENTITY_ID,
          sessionStartTime: MOCK_SESSION_START_TIME,
          pageSize: MOCK_PAGE_SIZE, // overriding to test pagination, as we only have 419 records of mock data
          cursor: '2022-05-10T20:39:23.6817084Z',
          forward: false,
        });
        expect(response.status).to.be(200);

        const alerts = response.body.events.filter(
          (event: any) => event._source.event.kind === 'signal'
        );

        expect(alerts.length).to.be(1); // only one since we are starting at the cursor of the first alert in the esarchiver data, and working backwards.

        const events = response.body.events.filter(
          (event: any) => event._source.event.kind === 'event'
        );

        expect(events[0]._source['@timestamp']).to.be.below(
          events[events.length - 1]._source['@timestamp']
        );
      });

      function addTests({ authorizedUsers, unauthorizedUsers }: TestCase) {
        authorizedUsers.forEach(({ username, password }) => {
          it(`${username} should be able to view alerts in session view`, async () => {
            const response = await supertestWithoutAuth
              .get(`${PROCESS_EVENTS_ROUTE}`)
              .auth(username, password)
              .set('kbn-xsrf', 'true')
              .set('Elastic-Api-Version', CURRENT_API_VERSION)
              .query({
                index: MOCK_INDEX,
                sessionEntityId: MOCK_SESSION_ENTITY_ID,
                sessionStartTime: MOCK_SESSION_START_TIME,
                pageSize: MOCK_PAGE_SIZE, // overriding to test pagination, as we only have 419 records of mock data
                cursor: '2022-05-10T20:39:23.6817084Z', // paginating from the timestamp of the first alert.
              });
            expect(response.status).to.be(200);

            const alerts = response.body.events.filter(
              (event: any) => event._source.event.kind === 'signal'
            );

            expect(alerts.length).to.above(0);
          });
        });

        unauthorizedUsers.forEach(({ username, password }) => {
          it(`${username} should NOT be able to view alerts in session view`, async () => {
            const response = await supertestWithoutAuth
              .get(`${PROCESS_EVENTS_ROUTE}`)
              .auth(username, password)
              .set('kbn-xsrf', 'true')
              .set('Elastic-Api-Version', CURRENT_API_VERSION)
              .query({
                index: MOCK_INDEX,
                sessionEntityId: MOCK_SESSION_ENTITY_ID,
                sessionStartTime: MOCK_SESSION_START_TIME,
                cursor: '2022-05-10T20:39:23.6817084Z', // paginating from the timestamp of the first alert.
              });
            expect(response.status).to.be(200);

            if (username === 'no_kibana_privileges') {
              expect(response.body.events.length).to.be.equal(0);
            } else {
              // process events should still load (since logs-* is granted, except for no_kibana_privileges user)
              expect(response.body.events.length).to.be.above(0);
            }

            const alerts = response.body.events.filter(
              (event: any) => event._source.event.kind === 'signal'
            );

            expect(alerts.length).to.be(0);
          });
        });
      }

      describe('Session View', () => {
        const authorizedInAllSpaces = [superUser, globalRead, secOnlyReadSpacesAll];
        const unauthorized = [
          // these users are not authorized to get alerts for session view
          obsOnlySpacesAll,
          noKibanaPrivileges,
        ];

        addTests({
          authorizedUsers: [...authorizedInAllSpaces],
          unauthorizedUsers: [...unauthorized],
        });
      });
    });

    describe(`Session view - ${PROCESS_EVENTS_ROUTE} - with merged fork/exec/end events`, () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/session_view/process_events_merged'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/session_view/process_events_merged'
        );
      });

      it(`${PROCESS_EVENTS_ROUTE} returns a page of process events`, async () => {
        const response = await getTestRoute().query({
          index: MOCK_INDEX,
          sessionEntityId: MOCK_SESSION_ENTITY_ID,
          sessionStartTime: MOCK_SESSION_START_TIME,
          pageSize: MOCK_PAGE_SIZE, // overriding to test pagination, as we only have 419 records of mock data
        });
        expect(response.status).to.be(200);
        expect(response.body.total).to.be.greaterThan(0);
        expect(response.body.events.length).to.be.greaterThan(0);
      });
    });

    describe(`Session view - ${PROCESS_EVENTS_ROUTE} - with Auditbeat Events`, () => {
      const MOCK_INDEX_AUDITBEAT = '.ds-auditbeat-8.14.0-2024.03.26-000001';

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/session_view/process_events_auditbeat'
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/session_view/process_events_auditbeat_alerts'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/session_view/process_events_auditbeat_alerts'
        );
        await esArchiver.load(
          'x-pack/test/functional/es_archives/session_view/process_events_auditbeat_alerts'
        );
      });

      it(`${PROCESS_EVENTS_ROUTE} returns a page of Auditbeat process events`, async () => {
        const MOCK_SESSION_ENTITY_ID_AUDITBEAT =
          'NDAyNjUzMTgzNl9fOTIxYjkxYzktZjJlMS00MjZhLThmZWYtYjgwYTNlMWY3MDQxX18yMjA2X18xNzEyMTA2MjIx';
        const MOCK_SESSION_START_TIME_AUDITBEAT = '2024-04-03T01:03:41.970Z';

        const response = await getTestRoute().query({
          index: MOCK_INDEX_AUDITBEAT,
          sessionEntityId: MOCK_SESSION_ENTITY_ID_AUDITBEAT,
          sessionStartTime: MOCK_SESSION_START_TIME_AUDITBEAT,
        });

        expect(response.status).to.be(200);
        expect(response.body.total).to.be.greaterThan(0);
        expect(response.body.events.length).to.be.greaterThan(0);
      });

      it(`${PROCESS_EVENTS_ROUTE} returns a page of Auditbeat process events (w alerts)`, async () => {
        const MOCK_SESSION_ENTITY_ID_AUDITBEAT_ALERT =
          'NDAyNjUzMTgzNl9fOTIxYjkxYzktZjJlMS00MjZhLThmZWYtYjgwYTNlMWY3MDQxX18xNTA5X18xNzEyMTAxNzk4';
        const MOCK_SESSION_START_TIME_AUDITBEAT_ALERT = '2024-04-02T23:49:58.700Z';

        const response = await getTestRoute().query({
          index: MOCK_INDEX_AUDITBEAT,
          sessionEntityId: MOCK_SESSION_ENTITY_ID_AUDITBEAT_ALERT,
          sessionStartTime: MOCK_SESSION_START_TIME_AUDITBEAT_ALERT,
          pageSize: MOCK_PAGE_SIZE, // overriding to test pagination, as we only have 419 records of mock data
        });
        expect(response.status).to.be(200);

        const alerts = response.body.events.filter(
          (event: any) => event._source.event.kind === 'signal'
        );

        expect(alerts.length).to.above(0);
      });
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { find } from 'lodash';

import { kpiEventsQuery } from '../../../../plugins/siem/public/containers/kpi_events/index.gql_query';
import { Direction, GetKpiEventsQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

const kpiEventsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');

  describe('events', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('Make sure that we get KPI Events data', () => {
      return client
        .query<GetKpiEventsQuery.Query>({
          query: kpiEventsQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              interval: '12h',
              to: TO,
              from: FROM,
            },
            pagination: {
              limit: 0,
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
          expect(events.kpiEventType!.length).to.be(5);

          const userLogin: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType!, {
            value: 'existing_package',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(userLogin.value).to.be('existing_package');
          expect(userLogin.count).to.be(1244);

          const userErr: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType!, {
            value: 'existing_process',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(userErr.value).to.be('existing_process');
          expect(userErr.count).to.be(153);

          const userStart: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType!, {
            value: 'logged-in',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(userStart.value).to.be('logged-in');
          expect(userStart.count).to.be(134);

          const credAcq: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType!, {
            value: 'socket_opened',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(credAcq.value).to.be('socket_opened');
          expect(credAcq.count).to.be(25);

          const credDisp: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType!, {
            value: 'error',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(credDisp.value).to.be('error');
          expect(credDisp.count).to.be(73);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default kpiEventsTests;

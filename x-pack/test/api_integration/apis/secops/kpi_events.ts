/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { find } from 'lodash';

import { kpiEventsQuery } from '../../../../plugins/secops/public/containers/kpi_events/index.gql_query';
import { GetKpiEventsQuery } from '../../../../plugins/secops/public/graphql/types';
import { KbnTestProvider } from './types';

// typical values that have to change after an update from "scripts/es_archiver"
const FROM = new Date('2019-02-19T00:00:00.000Z').valueOf();
const TO = new Date('2019-02-19T20:00:00.000Z').valueOf();

const kpiEventsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

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
              direction: 'descending',
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
          expect(userStart.count).to.be(26);

          const credAcq: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType!, {
            value: 'existing_socket',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(credAcq.value).to.be('existing_socket');
          expect(credAcq.count).to.be(16);

          const credDisp: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType!, {
            value: 'error',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(credDisp.value).to.be('error');
          expect(credDisp.count).to.be(14);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default kpiEventsTests;

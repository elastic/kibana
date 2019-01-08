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
              to: 1546554465535,
              from: 1483306065535,
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
          expect(events.kpiEventType.length).to.be(5);

          const userLogin: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType, {
            value: 'user_login',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(userLogin.value).to.be('user_login');
          expect(userLogin.count).to.be(12);

          const userErr: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType, {
            value: 'user_err',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(userErr.value).to.be('user_err');
          expect(userErr.count).to.be(7);

          const userStart: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType, {
            value: 'user_start',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(userStart.value).to.be('user_start');
          expect(userStart.count).to.be(3);

          const credAcq: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType, {
            value: 'cred_acq',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(credAcq.value).to.be('cred_acq');
          expect(credAcq.count).to.be(1);

          const credDisp: GetKpiEventsQuery.KpiEventType = find(events.kpiEventType, {
            value: 'cred_disp',
          }) as GetKpiEventsQuery.KpiEventType;
          expect(credDisp.value).to.be('cred_disp');
          expect(credDisp.count).to.be(1);
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default kpiEventsTests;

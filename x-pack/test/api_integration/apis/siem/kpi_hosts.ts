/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { kpiHostsQuery } from '../../../../plugins/siem/public/containers/kpi_hosts/index.gql_query';
import { GetKpiHostsQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const kpiHostsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Kpi Hosts', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

      it('Make sure that we get KpiHosts data', () => {
        return client
          .query<GetKpiHostsQuery.Query>({
            query: kpiHostsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
            },
          })
          .then(resp => {
            const kpiHosts = resp.data.source.KpiHosts;
            expect(kpiHosts!.hosts).to.be(1);
            expect(kpiHosts!.installedPackages).to.be(0);
            expect(kpiHosts!.processCount).to.equal(0);
            expect(kpiHosts!.authenticationSuccess).to.equal(0);
            expect(kpiHosts!.authenticationFailure).to.equal(0);
            expect(kpiHosts!.fimEvents).to.equal(0);
            expect(kpiHosts!.auditdEvents).to.equal(0);
            expect(kpiHosts!.winlogbeatEvents).to.equal(0);
            expect(kpiHosts!.filebeatEvents).to.equal(6157);
            expect(kpiHosts!.sockets).to.equal(0);
            expect(kpiHosts!.uniqueSourceIps).to.equal(121);
            expect(kpiHosts!.uniqueDestinationIps).to.equal(154);
          });
      });
    });

    describe('With auditbeat', () => {
      before(() => esArchiver.load('auditbeat/default'));
      after(() => esArchiver.unload('auditbeat/default'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();

      it('Make sure that we get KpiHosts data', () => {
        return client
          .query<GetKpiHostsQuery.Query>({
            query: kpiHostsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
            },
          })
          .then(resp => {
            const kpiHosts = resp.data.source.KpiHosts;

            expect(kpiHosts!.hosts).to.be(1);
            expect(kpiHosts!.installedPackages).to.be(0);
            expect(kpiHosts!.processCount).to.equal(0);
            expect(kpiHosts!.authenticationSuccess).to.equal(0);
            expect(kpiHosts!.authenticationFailure).to.equal(0);
            expect(kpiHosts!.fimEvents).to.equal(0);
            expect(kpiHosts!.auditdEvents).to.equal(0);
            expect(kpiHosts!.winlogbeatEvents).to.equal(0);
            expect(kpiHosts!.filebeatEvents).to.equal(6157);
            expect(kpiHosts!.sockets).to.equal(0);
            expect(kpiHosts!.uniqueSourceIps).to.equal(121);
            expect(kpiHosts!.uniqueDestinationIps).to.equal(154);
          });
      });
    });
  });
};

// tslint:disable-next-line no-default-export
export default kpiHostsTests;

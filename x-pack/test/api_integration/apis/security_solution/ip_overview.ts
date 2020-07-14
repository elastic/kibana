/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ipOverviewQuery } from '../../../../plugins/security_solution/public/network/containers/ip_overview/index.gql_query';
import { GetIpOverviewQuery } from '../../../../plugins/security_solution/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('securitySolutionGraphQLClient');
  describe('IP Overview', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      it('Make sure that we get KpiNetwork data', () => {
        return client
          .query<GetIpOverviewQuery.Query>({
            query: ipOverviewQuery,
            variables: {
              sourceId: 'default',
              ip: '151.205.0.17',
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then((resp) => {
            const ipOverview = resp.data.source.IpOverview;
            expect(ipOverview!.source!.geo!.continent_name).to.be('North America');
            expect(ipOverview!.source!.geo!.location!.lat!).to.be(37.751);
            expect(ipOverview!.host.os!.platform!).to.be('raspbian');
            expect(ipOverview!.destination!.geo!.continent_name).to.be('North America');
            expect(ipOverview!.destination!.geo!.location!.lat!).to.be(37.751);
            expect(ipOverview!.host.os!.platform!).to.be('raspbian');
          });
      });
    });

    describe('With packetbeat', () => {
      before(() => esArchiver.load('packetbeat/default'));
      after(() => esArchiver.unload('packetbeat/default'));

      it('Make sure that we get KpiNetwork data', () => {
        return client
          .query<GetIpOverviewQuery.Query>({
            query: ipOverviewQuery,
            variables: {
              sourceId: 'default',
              ip: '185.53.91.88',
              defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
              inspect: false,
            },
          })
          .then((resp) => {
            const ipOverview = resp.data.source.IpOverview;
            expect(ipOverview!.host.id!).to.be('2ce8b1e7d69e4a1d9c6bcddc473da9d9');
            expect(ipOverview!.host.name!).to.be('zeek-sensor-amsterdam');
            expect(ipOverview!.host.os!.platform!).to.be('ubuntu');
          });
      });
    });
  });
}

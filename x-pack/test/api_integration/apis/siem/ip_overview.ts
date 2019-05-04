/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ipOverviewQuery } from '../../../../plugins/siem/public/containers/ip_overview/index.gql_query';
import { GetIpOverviewQuery } from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const ipOverviewTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
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
            },
          })
          .then(resp => {
            const ipOverview = resp.data.source.IpOverview;
            expect(ipOverview!.source!.geo!.continent_name).to.be('North America');
            expect(ipOverview!.source!.geo!.location!.lat!).to.be(37.751);
            expect(ipOverview!.source!.host!.os!.platform!).to.be('raspbian');
            expect(ipOverview!.destination!.geo!.continent_name).to.be('North America');
            expect(ipOverview!.destination!.geo!.location!.lat!).to.be(37.751);
            expect(ipOverview!.destination!.host!.os!.platform!).to.be('raspbian');
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
            },
          })
          .then(resp => {
            const ipOverview = resp.data.source.IpOverview;
            expect(ipOverview!.destination!.host!.id!).to.be('2ce8b1e7d69e4a1d9c6bcddc473da9d9');
            expect(ipOverview!.destination!.host!.name!).to.be('zeek-sensor-amsterdam');
            expect(ipOverview!.destination!.host!.os!.platform!).to.be('ubuntu');
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default ipOverviewTests;

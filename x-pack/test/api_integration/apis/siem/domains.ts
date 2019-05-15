/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { domainsQuery } from '../../../../plugins/siem/public/containers/domains/index.gql_query';
import {
  Direction,
  DomainsFields,
  FlowDirection,
  FlowTarget,
  GetDomainsQuery,
} from '../../../../plugins/siem/public/graphql/types';
import { KbnTestProvider } from './types';

const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();
const IP = '10.100.7.196';

const domainsTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Domains', () => {
    describe('With filebeat', () => {
      before(() => esArchiver.load('filebeat/default'));
      after(() => esArchiver.unload('filebeat/default'));

      it('Ensure data is returned for FlowTarget.Source and Direction.Unidirectional', () => {
        return client
          .query<GetDomainsQuery.Query>({
            query: domainsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              ip: IP,
              flowDirection: FlowDirection.uniDirectional,
              flowTarget: FlowTarget.source,
              sort: { field: DomainsFields.bytes, direction: Direction.desc },
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const domains = resp.data.source.Domains;
            expect(domains.edges.length).to.be(1);
            expect(domains.totalCount).to.be(1);
            expect(domains.edges[0].node.source!.uniqueIpCount).to.be(122);
            expect(domains.edges[0].node.source!.domainName).to.be(
              'samsungtv-kitchen.iot.sr.local.crowbird.com'
            );
            expect(domains.edges[0].node.network!.bytes).to.be(25209932);
          });
      });

      it('Ensure data is returned for FlowTarget.Source and Direction.Bidirectional', () => {
        return client
          .query<GetDomainsQuery.Query>({
            query: domainsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              ip: IP,
              flowDirection: FlowDirection.biDirectional,
              flowTarget: FlowTarget.source,
              sort: { field: DomainsFields.bytes, direction: Direction.desc },
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const domains = resp.data.source.Domains;
            expect(domains.edges.length).to.be(1);
            expect(domains.totalCount).to.be(1);
            expect(domains.edges[0].node.source!.domainName).to.be(
              'samsungtv-kitchen.iot.sr.local.crowbird.com'
            );
            expect(domains.edges[0].node.source!.uniqueIpCount).to.be(81);
            expect(domains.edges[0].node.network!.bytes).to.be(27033419);
          });
      });

      it('Ensure data is returned for FlowTarget.Destination and Direction.Unidirectional and Pagination works', () => {
        return client
          .query<GetDomainsQuery.Query>({
            query: domainsQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              ip: IP,
              flowDirection: FlowDirection.uniDirectional,
              flowTarget: FlowTarget.destination,
              sort: { field: DomainsFields.bytes, direction: Direction.desc },
              pagination: {
                limit: 10,
                cursor: null,
              },
            },
          })
          .then(resp => {
            const domains = resp.data.source.Domains;
            expect(domains.edges.length).to.be(10);
            expect(domains.totalCount).to.be(12);
            expect(domains.edges.map(i => i.node.destination!.domainName).join(',')).to.be(
              'samsungtv-kitchen.iot.sr.local.crowbird.com,12s3.lvlt.dash.row.aiv-cdn.net,151.205.0.17,151.205.0.19,151.205.0.21,151.205.0.23,15s3.lvlt.dash.row.aiv-cdn.net,api-global.netflix.com,d25xi40x97liuc.cloudfront.net,d2lkq7nlcrdi7q.cloudfront.net'
            );
            expect(domains.pageInfo.endCursor!.value).to.equal('10');
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default domainsTests;

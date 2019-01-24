/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { first, last } from 'lodash';

import { waffleNodesQuery } from '../../../../plugins/infra/public/containers/waffle/waffle_nodes.gql_query';
import { WaffleNodesQuery } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

const waffleTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('waffle nodes', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    it('should basically work', () => {
      return client
        .query<WaffleNodesQuery.Query>({
          query: waffleNodesQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              to: 1539806283952,
              from: 1539805341208,
              interval: '1m',
            },
            metric: { type: 'cpu' },
            path: [{ type: 'hosts' }],
          },
        })
        .then(resp => {
          const { map } = resp.data.source;
          expect(map).to.have.property('nodes');
          if (map) {
            const { nodes } = map;
            expect(nodes.length).to.equal(6);
            const firstNode = first(nodes);
            expect(firstNode).to.have.property('path');
            expect(firstNode.path.length).to.equal(1);
            expect(first(firstNode.path)).to.have.property('value', 'demo-stack-apache-01');
            expect(firstNode).to.have.property('metric');
            expect(firstNode.metric).to.eql({
              name: 'cpu',
              value: 0.011,
              __typename: 'InfraNodeMetric',
            });
          }
        });
    });

    it('should basically work with 1 grouping', () => {
      return client
        .query<WaffleNodesQuery.Query>({
          query: waffleNodesQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              to: 1539806283952,
              from: 1539805341208,
              interval: '1m',
            },
            metric: { type: 'cpu' },
            path: [{ type: 'terms', field: 'meta.cloud.availability_zone' }, { type: 'hosts' }],
          },
        })
        .then(resp => {
          const { map } = resp.data.source;
          expect(map).to.have.property('nodes');
          if (map) {
            const { nodes } = map;
            expect(nodes.length).to.equal(6);
            const firstNode = first(nodes);
            expect(firstNode).to.have.property('path');
            expect(firstNode.path.length).to.equal(2);
            expect(first(firstNode.path)).to.have.property(
              'value',
              'projects/189716325846/zones/us-central1-f'
            );
            expect(last(firstNode.path)).to.have.property('value', 'demo-stack-apache-01');
          }
        });
    });

    it('should basically work with 2 grouping', () => {
      return client
        .query<WaffleNodesQuery.Query>({
          query: waffleNodesQuery,
          variables: {
            sourceId: 'default',
            timerange: {
              to: 1539806283952,
              from: 1539805341208,
              interval: '1m',
            },
            metric: { type: 'cpu' },
            path: [
              { type: 'terms', field: 'meta.cloud.provider' },
              { type: 'terms', field: 'meta.cloud.availability_zone' },
              { type: 'hosts' },
            ],
          },
        })
        .then(resp => {
          const { map } = resp.data.source;
          expect(map).to.have.property('nodes');
          if (map) {
            const { nodes } = map;
            expect(nodes.length).to.equal(6);
            const firstNode = first(nodes);
            expect(firstNode).to.have.property('path');
            expect(firstNode.path.length).to.equal(3);
            expect(first(firstNode.path)).to.have.property('value', 'gce');
            expect(last(firstNode.path)).to.have.property('value', 'demo-stack-apache-01');
          }
        });
    });
  });
};

// tslint:disable-next-line no-default-export
export default waffleTests;

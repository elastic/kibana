/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';

import { waffleNodesQuery } from '../../../../plugins/infra/public/containers/waffle/waffle_nodes.gql_query';
import { WaffleNodesQuery } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

import { DATES } from './constants';

const waffleTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('waffle nodes', () => {
    describe('6.6.0', () => {
      const { min, max } = DATES['6.6.0'].docker;
      before(() => esArchiver.load('infra/6.6.0/docker'));
      after(() => esArchiver.unload('infra/6.6.0/docker'));

      it('should basically work', () => {
        return client
          .query<WaffleNodesQuery.Query>({
            query: waffleNodesQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                to: max,
                from: min,
                interval: '1m',
              },
              metric: { type: 'cpu' },
              type: 'container',
              groupBy: [],
            },
          })
          .then(resp => {
            const { snapshot } = resp.data.source;
            expect(snapshot).to.have.property('nodes');
            if (snapshot) {
              const { nodes } = snapshot;
              expect(nodes.length).to.equal(5);
              const firstNode = first(nodes);
              expect(firstNode).to.have.property('path');
              expect(firstNode.path.length).to.equal(1);
              expect(first(firstNode.path)).to.have.property(
                'value',
                '242fddb9d376bbf0e38025d81764847ee5ec0308adfa095918fd3266f9d06c6a'
              );
              expect(first(firstNode.path)).to.have.property(
                'label',
                'docker-autodiscovery_nginx_1'
              );
              expect(firstNode).to.have.property('metric');
              expect(firstNode.metric).to.eql({
                name: 'cpu',
                value: 0,
                max: 0,
                avg: 0,
                __typename: 'InfraSnapshotNodeMetric',
              });
            }
          });
      });
    });

    describe('7.0.0', () => {
      const { min, max } = DATES['7.0.0'].hosts;
      before(() => esArchiver.load('infra/7.0.0/hosts'));
      after(() => esArchiver.unload('infra/7.0.0/hosts'));

      it('should basically work', () => {
        return client
          .query<WaffleNodesQuery.Query>({
            query: waffleNodesQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                to: max,
                from: min,
                interval: '1m',
              },
              metric: { type: 'cpu' },
              type: 'host',
              groupBy: [],
            },
          })
          .then(resp => {
            const { snapshot } = resp.data.source;
            expect(snapshot).to.have.property('nodes');
            if (snapshot) {
              const { nodes } = snapshot;
              expect(nodes.length).to.equal(1);
              const firstNode = first(nodes);
              expect(firstNode).to.have.property('path');
              expect(firstNode.path.length).to.equal(1);
              expect(first(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
              expect(first(firstNode.path)).to.have.property('label', 'demo-stack-mysql-01');
              expect(firstNode).to.have.property('metric');
              expect(firstNode.metric).to.eql({
                name: 'cpu',
                value: 0.003666666666666667,
                avg: 0.00809090909090909,
                max: 0.057833333333333334,
                __typename: 'InfraSnapshotNodeMetric',
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
                to: max,
                from: min,
                interval: '1m',
              },
              metric: { type: 'cpu' },
              type: 'host',
              groupBy: [{ field: 'cloud.availability_zone' }],
            },
          })
          .then(resp => {
            const { snapshot } = resp.data.source;
            expect(snapshot).to.have.property('nodes');
            if (snapshot) {
              const { nodes } = snapshot;
              expect(nodes.length).to.equal(1);
              const firstNode = first(nodes);
              expect(firstNode).to.have.property('path');
              expect(firstNode.path.length).to.equal(2);
              expect(first(firstNode.path)).to.have.property('value', 'virtualbox');
              expect(last(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
            }
          });
      });

      it('should basically work with 2 groupings', () => {
        return client
          .query<WaffleNodesQuery.Query>({
            query: waffleNodesQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                to: max,
                from: min,
                interval: '1m',
              },
              metric: { type: 'cpu' },
              type: 'host',
              groupBy: [{ field: 'cloud.provider' }, { field: 'cloud.availability_zone' }],
            },
          })
          .then(resp => {
            const { snapshot } = resp.data.source;
            expect(snapshot).to.have.property('nodes');
            if (snapshot) {
              const { nodes } = snapshot;
              expect(nodes.length).to.equal(1);
              const firstNode = first(nodes);
              expect(firstNode).to.have.property('path');
              expect(firstNode.path.length).to.equal(3);
              expect(first(firstNode.path)).to.have.property('value', 'vagrant');
              expect(firstNode.path[1]).to.have.property('value', 'virtualbox');
              expect(last(firstNode.path)).to.have.property('value', 'demo-stack-mysql-01');
            }
          });
      });

      it('should show metrics for all nodes when grouping by service type', () => {
        return client
          .query<WaffleNodesQuery.Query>({
            query: waffleNodesQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                to: max,
                from: min,
                interval: '1m',
              },
              metric: { type: 'cpu' },
              type: 'host',
              groupBy: [{ field: 'service.type' }],
            },
          })
          .then(resp => {
            const { snapshot } = resp.data.source;
            expect(snapshot).to.have.property('nodes');
            if (snapshot) {
              const { nodes } = snapshot;
              expect(nodes.length).to.equal(2);
              const firstNode = nodes[0];
              expect(firstNode).to.have.property('path');
              expect(firstNode.path.length).to.equal(2);
              expect(firstNode.path[0]).to.have.property('value', 'mysql');
              expect(firstNode.path[1]).to.have.property('value', 'demo-stack-mysql-01');
              expect(firstNode).to.have.property('metric');
              expect(firstNode.metric).to.eql({
                name: 'cpu',
                value: 0.003666666666666667,
                avg: 0.00809090909090909,
                max: 0.057833333333333334,
                __typename: 'InfraSnapshotNodeMetric',
              });
              const secondNode = nodes[1];
              expect(secondNode).to.have.property('path');
              expect(secondNode.path.length).to.equal(2);
              expect(secondNode.path[0]).to.have.property('value', 'system');
              expect(secondNode.path[1]).to.have.property('value', 'demo-stack-mysql-01');
              expect(secondNode).to.have.property('metric');
              expect(secondNode.metric).to.eql({
                name: 'cpu',
                value: 0.003666666666666667,
                avg: 0.00809090909090909,
                max: 0.057833333333333334,
                __typename: 'InfraSnapshotNodeMetric',
              });
            }
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default waffleTests;

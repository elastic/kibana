/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';

import {
  InfraSnapshotMetricInput,
  InfraNodeType,
  InfraTimerangeInput,
  InfraSnapshotGroupbyInput,
} from '../../../../legacy/plugins/infra/server/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { SnapshotNodeResponse } from '../../../../legacy/plugins/infra/common/http_api/snapshot_api';
import { DATES } from './constants';

interface SnapshotRequest {
  filterQuery?: string | null;
  metric: InfraSnapshotMetricInput;
  groupBy: InfraSnapshotGroupbyInput[];
  nodeType: InfraNodeType;
  sourceId: string;
  timerange: InfraTimerangeInput;
}

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const fetchSnapshot = async (
    body: SnapshotRequest
  ): Promise<SnapshotNodeResponse | undefined> => {
    const response = await supertest
      .post('/api/metrics/snapshot')
      .set('kbn-xsrf', 'xxx')
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('waffle nodes', () => {
    describe('6.6.0', () => {
      const { min, max } = DATES['6.6.0'].docker;
      before(() => esArchiver.load('infra/6.6.0/docker'));
      after(() => esArchiver.unload('infra/6.6.0/docker'));

      it('should basically work', () => {
        const resp = fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metric: { type: 'cpu' } as InfraSnapshotMetricInput,
          nodeType: 'container' as InfraNodeType,
          groupBy: [],
        });
        return resp.then(data => {
          if (!resp) {
            return;
          }
          const snapshot = data;
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
            expect(first(firstNode.path)).to.have.property('label', 'docker-autodiscovery_nginx_1');
            expect(firstNode).to.have.property('metric');
            expect(firstNode.metric).to.eql({
              name: 'cpu',
              value: 0,
              max: 0,
              avg: 0,
            });
          }
        });
      });
    });

    describe('8.0.0', () => {
      const { min, max } = DATES['8.0.0'].logs_and_metrics;
      before(() => esArchiver.load('infra/8.0.0/logs_and_metrics'));
      after(() => esArchiver.unload('infra/8.0.0/logs_and_metrics'));

      it("should use the id for the label when the name doesn't exist", () => {
        const resp = fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metric: { type: 'cpu' } as InfraSnapshotMetricInput,
          nodeType: 'pod' as InfraNodeType,
          groupBy: [],
        });
        return resp.then(data => {
          const snapshot = data;
          expect(snapshot).to.have.property('nodes');
          if (snapshot) {
            const { nodes } = snapshot;
            expect(nodes.length).to.equal(65);
            const firstNode = first(nodes);
            expect(firstNode).to.have.property('path');
            expect(firstNode.path.length).to.equal(1);
            expect(first(firstNode.path)).to.have.property(
              'value',
              '00597dd7-a348-11e9-9a96-42010a84004d'
            );
            expect(first(firstNode.path)).to.have.property(
              'label',
              '00597dd7-a348-11e9-9a96-42010a84004d'
            );
          }
        });
      });
      it('should have an id and label', () => {
        const resp = fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metric: { type: 'cpu' } as InfraSnapshotMetricInput,
          nodeType: 'container' as InfraNodeType,
          groupBy: [],
        });
        return resp.then(data => {
          const snapshot = data;
          expect(snapshot).to.have.property('nodes');
          if (snapshot) {
            const { nodes } = snapshot;
            expect(nodes.length).to.equal(136);
            const firstNode = first(nodes);
            expect(firstNode).to.have.property('path');
            expect(firstNode.path.length).to.equal(1);
            expect(first(firstNode.path)).to.have.property(
              'value',
              '01078c21eef4194b0b96253c7c6c32796aba66e3f3f37e26ac97d1dff3e2e91a'
            );
            expect(first(firstNode.path)).to.have.property(
              'label',
              'k8s_prometheus-to-sd-exporter_fluentd-gcp-v3.2.0-wcmm4_kube-system_b214d17a-9ae0-11e9-9a96-42010a84004d_0'
            );
          }
        });
      });
    });

    describe('7.0.0', () => {
      const { min, max } = DATES['7.0.0'].hosts;
      before(() => esArchiver.load('infra/7.0.0/hosts'));
      after(() => esArchiver.unload('infra/7.0.0/hosts'));

      it('should basically work', () => {
        const resp = fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metric: { type: 'cpu' } as InfraSnapshotMetricInput,
          nodeType: 'host' as InfraNodeType,
          groupBy: [],
        });
        return resp.then(data => {
          const snapshot = data;
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
              value: 0.009285714285714286,
              max: 0.009285714285714286,
              avg: 0.0015476190476190477,
            });
          }
        });
      });

      it('should basically work with 1 grouping', () => {
        const resp = fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metric: { type: 'cpu' } as InfraSnapshotMetricInput,
          nodeType: 'host' as InfraNodeType,
          groupBy: [{ field: 'cloud.availability_zone' }],
        });
        return resp.then(data => {
          const snapshot = data;
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
        const resp = fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metric: { type: 'cpu' } as InfraSnapshotMetricInput,
          nodeType: 'host' as InfraNodeType,
          groupBy: [{ field: 'cloud.provider' }, { field: 'cloud.availability_zone' }],
        });

        return resp.then(data => {
          const snapshot = data;
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
        const resp = fetchSnapshot({
          sourceId: 'default',
          timerange: {
            to: max,
            from: min,
            interval: '1m',
          },
          metric: { type: 'cpu' } as InfraSnapshotMetricInput,
          nodeType: 'host' as InfraNodeType,
          groupBy: [{ field: 'service.type' }],
        });
        return resp.then(data => {
          const snapshot = data;
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
              value: 0.009285714285714286,
              max: 0.009285714285714286,
              avg: 0.0015476190476190477,
            });
            const secondNode = nodes[1];
            expect(secondNode).to.have.property('path');
            expect(secondNode.path.length).to.equal(2);
            expect(secondNode.path[0]).to.have.property('value', 'system');
            expect(secondNode.path[1]).to.have.property('value', 'demo-stack-mysql-01');
            expect(secondNode).to.have.property('metric');
            expect(secondNode.metric).to.eql({
              name: 'cpu',
              value: 0.009285714285714286,
              max: 0.009285714285714286,
              avg: 0.0015476190476190477,
            });
          }
        });
      });
    });
  });
}

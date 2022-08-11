/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';

import { InfraTimerangeInput } from '@kbn/infra-plugin/common/http_api/snapshot_api';
import { InventoryMetric } from '@kbn/infra-plugin/common/inventory_models/types';
import { NodeDetailsMetricDataResponse } from '@kbn/infra-plugin/common/http_api/node_details_api';
import { FtrProviderContext } from '../../ftr_provider_context';

import { DATES } from './constants';

const { min, max } = DATES['7.0.0'].hosts;

interface NodeDetailsRequest {
  metrics: InventoryMetric[];
  nodeId: string;
  nodeType: string;
  sourceId: string;
  timerange: InfraTimerangeInput;
  cloudId?: string;
}

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('metrics', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/7.0.0/hosts'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/7.0.0/hosts'));

    const fetchNodeDetails = async (
      body: NodeDetailsRequest
    ): Promise<NodeDetailsMetricDataResponse | undefined> => {
      const response = await supertest
        .post('/api/metrics/node_details')
        .set('kbn-xsrf', 'xxx')
        .send(body)
        .expect(200);
      return response.body;
    };

    it('should basically work', async () => {
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['hostCpuUsage'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: 'demo-stack-mysql-01',
        nodeType: 'host',
      });
      return data.then((resp) => {
        if (!resp) {
          return;
        }
        expect(resp.metrics.length).to.equal(1);
        const metric = first(resp.metrics) as any;
        expect(metric).to.have.property('id', 'hostCpuUsage');
        expect(metric).to.have.property('series');
        const series = first(metric.series) as any;
        expect(series).to.have.property('id', 'user');
        expect(series).to.have.property('data');
        const datapoint = last(series.data) as any;
        expect(datapoint).to.have.property('timestamp', 1547571780000);
        expect(datapoint).to.have.property('value', 0.0015);
      });
    });

    it('should support multiple metrics', async () => {
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['hostCpuUsage', 'hostLoad'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: 'demo-stack-mysql-01',
        nodeType: 'host',
      });
      return data.then((resp) => {
        if (!resp) {
          return;
        }

        expect(resp.metrics.length).to.equal(2);
      });
    });

    it('should return multiple values for hostSystemOverview metric', () => {
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['hostSystemOverview'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: 'demo-stack-mysql-01',
        nodeType: 'host',
      });
      return data.then((resp) => {
        if (!resp) {
          return;
        }

        const hostSystemOverviewMetric = resp.metrics.find(
          (metric) => metric.id === 'hostSystemOverview'
        );

        expect(hostSystemOverviewMetric?.series.length).to.be.greaterThan(1);
      });
    });
  });
}

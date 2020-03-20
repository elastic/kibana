/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { first, last } from 'lodash';

import { InventoryMetric } from '../../../../plugins/infra/common/inventory_models/types';
import { InfraNodeType, InfraTimerangeInput } from '../../../../plugins/infra/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';

import { DATES } from './constants';

import { NodeDetailsMetricDataResponse } from '../../../../plugins/infra/common/http_api/node_details_api';
const { min, max } = DATES['7.0.0'].hosts;

interface NodeDetailsRequest {
  metrics: InventoryMetric[];
  nodeId: string;
  nodeType: InfraNodeType;
  sourceId: string;
  timerange: InfraTimerangeInput;
  cloudId?: string;
}

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('metrics', () => {
    before(() => esArchiver.load('infra/7.0.0/hosts'));
    after(() => esArchiver.unload('infra/7.0.0/hosts'));

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

    it('should basically work', () => {
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['hostCpuUsage'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: 'demo-stack-mysql-01',
        nodeType: 'host' as InfraNodeType,
      });
      return data.then(resp => {
        if (!resp) {
          return;
        }
        expect(resp.metrics.length).to.equal(1);
        const metric = first(resp.metrics);
        expect(metric).to.have.property('id', 'hostCpuUsage');
        expect(metric).to.have.property('series');
        const series = first(metric.series);
        expect(series).to.have.property('id', 'user');
        expect(series).to.have.property('data');
        const datapoint = last(series.data);
        expect(datapoint).to.have.property('timestamp', 1547571720000);
        expect(datapoint).to.have.property('value', 0.0018333333333333333);
      });
    });

    it('should support multiple metrics', () => {
      const data = fetchNodeDetails({
        sourceId: 'default',
        metrics: ['hostCpuUsage', 'hostLoad'],
        timerange: {
          to: max,
          from: min,
          interval: '>=1m',
        },
        nodeId: 'demo-stack-mysql-01',
        nodeType: 'host' as InfraNodeType,
      });
      return data.then(resp => {
        if (!resp) {
          return;
        }

        expect(resp.metrics.length).to.equal(2);
      });
    });
  });
}

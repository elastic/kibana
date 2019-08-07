/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { first } from 'lodash';
import {
  InfraApmMetrics,
  InfraApmMetricsRequest,
} from '../../../../legacy/plugins/infra/common/http_api/apm_metrics_api';
import { DATES } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export const apmMetricsTests = ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const fetchMetrics = async (
    body: InfraApmMetricsRequest
  ): Promise<InfraApmMetrics | undefined> => {
    const response = await supertest
      .post('/api/infra/apm_metrics')
      .set('kbn-xsrf', 'xxx')
      .send(body)
      .expect(200);
    return response.body;
  };

  // eslint-disable-next-line
  describe.only('/api/infra/apm_metrics', () => {
    const archiveName = 'infra/8.0.0/metrics_and_apm';
    before(() => esArchiver.load(archiveName));
    after(() => esArchiver.unload(archiveName));

    it('should just work', async () => {
      const metrics = await fetchMetrics({
        nodeId: '7ff0afee-9ae8-11e9-9a96-42010a84004d',
        nodeType: 'pod',
        sourceId: 'default',
        timeRange: DATES['8.0.0'].metrics_and_apm,
      });
      expect(metrics).to.have.property('services');
      expect(metrics!.services).to.have.length(1);
      const firstService = first(metrics!.services);
      expect(firstService).to.have.property('id', 'opbeans-go');
      expect(firstService).to.have.property('transactionsPerMinute', 5.2862003063285306);
      expect(firstService).to.have.property('avgResponseTime', 8879.423076923076);
      expect(firstService).to.have.property('errorsPerMinute', 0);
      expect(firstService).to.have.property('agentName', 'go');
      expect(firstService).to.have.property('dataSets');
      expect(firstService.dataSets).to.have.length(2);
      const dataSet = firstService.dataSets.find(
        d => d.id === 'responseTimes' && d.type === 'request'
      );
      expect(dataSet).to.be.ok();
      expect(dataSet!.series).to.have.length(3);
      const series = dataSet!.series.find(s => s.id === 'avg');
      expect(series).to.be.ok();
      expect(series!.data).to.have.length(296);
      const dataPoint = series!.data.find(d => d.timestamp === 1564432831000);
      expect(dataPoint).to.eql({
        timestamp: 1564432831000,
        value: 10623,
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default apmMetricsTests;

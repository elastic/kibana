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
import { KbnTestProvider } from './types';

export const apmMetricsTests: KbnTestProvider = ({ getService }) => {
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
      expect(firstService).to.have.property('name', 'opbeans-go');
      expect(firstService).to.have.property('transactionsPerMinute');
      expect(firstService.transactionsPerMinute).to.have.length(1);
      const firstTPM = first(firstService.transactionsPerMinute);
      expect(firstTPM).to.have.property('name', 'HTTP 2xx');
      expect(firstTPM.data).to.have.length(296);
      expect(firstService.responseTimes).to.have.length(3);
      const firstResponseTime = first(firstService.responseTimes);
      expect(firstResponseTime).to.have.property('name', 'avg');
      expect(firstResponseTime.data).to.have.length(296);
      const dataPoint = firstResponseTime.data.find(d => d.timestamp === 1564432831000);
      expect(dataPoint).to.eql({
        timestamp: 1564432831000,
        value: 10623,
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default apmMetricsTests;

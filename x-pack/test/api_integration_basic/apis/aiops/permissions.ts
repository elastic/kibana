/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { format as formatUrl } from 'url';

import expect from '@kbn/expect';

import type { ApiExplainLogRateSpikes } from '@kbn/aiops-plugin/common/api';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));

  const requestBody: ApiExplainLogRateSpikes['body'] = {
    baselineMax: 1561719083292,
    baselineMin: 1560954147006,
    deviationMax: 1562254538692,
    deviationMin: 1561986810992,
    end: 2147483647000,
    index: 'ft_ecommerce',
    searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
    start: 0,
    timeFieldName: 'order_date',
  };

  describe('POST /internal/aiops/explain_log_rate_spikes', () => {
    it('should return permission denied without streaming', async () => {
      await supertest
        .post(`/internal/aiops/explain_log_rate_spikes`)
        .set('kbn-xsrf', 'kibana')
        .send(requestBody)
        .expect(403);
    });

    it('should return permission denied with streaming', async () => {
      const response = await fetch(`${kibanaServerUrl}/internal/aiops/explain_log_rate_spikes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'stream',
        },
        body: JSON.stringify(requestBody),
      });

      expect(response.ok).to.be(false);
      expect(response.status).to.be(403);
    });
  });
};

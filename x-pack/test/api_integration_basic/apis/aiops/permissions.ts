/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { format as formatUrl } from 'url';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import expect from '@kbn/expect';
import type {
  AiopsLogRateAnalysisSchema,
  AiopsLogRateAnalysisApiVersion as ApiVersion,
} from '@kbn/aiops-log-rate-analysis/api/schema';

import type { FtrProviderContext } from '../../ftr_provider_context';

const API_VERSIONS: ApiVersion[] = ['3'];

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));

  describe('POST /internal/aiops/log_rate_analysis', () => {
    API_VERSIONS.forEach((apiVersion) => {
      describe(`with API v${apiVersion}`, () => {
        const requestBody: AiopsLogRateAnalysisSchema<typeof apiVersion> = {
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

        it('should return permission denied without streaming', async () => {
          await supertest
            .post(`/internal/aiops/log_rate_analysis`)
            .set('kbn-xsrf', 'kibana')
            .set(ELASTIC_HTTP_VERSION_HEADER, apiVersion)
            .send(requestBody)
            .expect(403);
        });

        it('should return permission denied with streaming', async () => {
          const response = await fetch(`${kibanaServerUrl}/internal/aiops/log_rate_analysis`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'kbn-xsrf': 'stream',
              [ELASTIC_HTTP_VERSION_HEADER]: apiVersion,
            },
            body: JSON.stringify(requestBody),
          });

          expect(response.ok).to.be(false);
          expect(response.status).to.be(403);
        });
      });
    });
  });
};

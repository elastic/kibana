/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { GetInfraMetricsRequestBodyPayloadClient } from '@kbn/infra-plugin/common/http_api/infra';
import { DATES } from './utils/constants';
import type { FtrProviderContext } from '../../ftr_provider_context';

const ENDPOINT = '/api/metrics/infra/host';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  const basePayload: GetInfraMetricsRequestBodyPayloadClient = {
    limit: 10,
    metrics: [
      'cpu',
      'cpuV2',
      'diskSpaceUsage',
      'memory',
      'memoryFree',
      'normalizedLoad1m',
      'rx',
      'tx',
    ],
    from: new Date(DATES['8.0.0'].logs_and_metrics.min).toISOString(),
    to: new Date(DATES['8.0.0'].logs_and_metrics.max).toISOString(),
    query: { bool: { must_not: [], filter: [], should: [], must: [] } },
  };

  describe('Hosts', () => {
    const makeRequest = async ({
      body,
      invalidBody,
      expectedHTTPCode,
    }: {
      body?: GetInfraMetricsRequestBodyPayloadClient;
      invalidBody?: any;
      expectedHTTPCode: number;
    }) => {
      return supertest
        .post(ENDPOINT)
        .send(body ?? invalidBody)
        .expect(expectedHTTPCode);
    };

    // TODO: This test fails on serverless because the alerts esarchiver is not loaded
    // This happens because in serverless .alerts.* indicies are managed data streams
    // and the esarchiver fails because the mapping.json is configured to create an index
    describe('Host with active alerts', () => {
      before(async () => {
        await Promise.all([
          esArchiver.load('x-pack/test/functional/es_archives/infra/alerts'),
          esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
        ]);
      });

      after(async () => {
        await Promise.all([
          esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts'),
          esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
        ]);
      });

      describe('fetch hosts', () => {
        it('should return metrics for a host with alert count', async () => {
          const body: GetInfraMetricsRequestBodyPayloadClient = {
            ...basePayload,
            from: '2018-10-17T19:42:21.208Z',
            to: '2018-10-17T19:58:03.952Z',
            limit: 1,
          };
          const response = await makeRequest({ body, expectedHTTPCode: 200 });

          expect(response.body.nodes).length(1);
          expect(response.body.nodes[0].alertsCount).eql(2);
        });
      });
    });
  });
}

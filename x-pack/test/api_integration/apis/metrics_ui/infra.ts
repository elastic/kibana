/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  GetInfraMetricsRequestBodyPayload,
  GetInfraMetricsResponsePayload,
} from '@kbn/infra-plugin/common/http_api/infra';
import { DATES } from './constants';
import { FtrProviderContext } from '../../ftr_provider_context';

const ENDPOINT = '/api/metrics/infra';

const normalizeNewLine = (text: string) => {
  return text.replaceAll(/(\s{2,}|\\n\\s)/g, ' ');
};
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  const basePayload: GetInfraMetricsRequestBodyPayload = {
    type: 'host',
    limit: 10,
    metrics: [
      {
        type: 'cpu',
      },
      {
        type: 'diskSpaceUsage',
      },
      {
        type: 'memory',
      },
      {
        type: 'memoryFree',
      },
      {
        type: 'normalizedLoad1m',
      },
      {
        type: 'rx',
      },
      {
        type: 'tx',
      },
    ],
    range: {
      from: new Date(DATES['8.0.0'].logs_and_metrics.min).toISOString(),
      to: new Date(DATES['8.0.0'].logs_and_metrics.max).toISOString(),
    },
    query: { bool: { must_not: [], filter: [], should: [], must: [] } },
  };

  const makeRequest = async ({
    body,
    invalidBody,
    expectedHTTPCode,
  }: {
    body?: GetInfraMetricsRequestBodyPayload;
    invalidBody?: any;
    expectedHTTPCode: number;
  }) => {
    return supertest
      .post(ENDPOINT)
      .set('kbn-xsrf', 'xxx')
      .send(body ?? invalidBody)
      .expect(expectedHTTPCode);
  };

  describe('Hosts', () => {
    before(() =>
      esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics')
    );
    after(() =>
      esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics')
    );

    describe('fetch hosts', () => {
      it('should return metrics for a host', async () => {
        const body: GetInfraMetricsRequestBodyPayload = { ...basePayload, limit: 1 };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        expect(response.body.nodes).length(1);
        expect(response.body.nodes).eql([
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [
              { name: 'cpu', value: 0.44708333333333333 },
              { name: 'diskSpaceUsage', value: 0 },
              { name: 'memory', value: 0.4563333333333333 },
              { name: 'memoryFree', value: 8573890560 },
              { name: 'normalizedLoad1m', value: 0.7375000000000002 },
              { name: 'rx', value: null },
              { name: 'tx', value: null },
            ],
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          },
        ]);
      });

      it('should return all hosts if query params is not sent', async () => {
        const body: GetInfraMetricsRequestBodyPayload = {
          ...basePayload,
          metrics: [
            {
              type: 'memory',
            },
          ],
          query: undefined,
        };

        const response = await makeRequest({ body, expectedHTTPCode: 200 });
        expect(response.body.nodes).eql([
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [{ name: 'memory', value: 0.4563333333333333 }],
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          },
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [{ name: 'memory', value: 0.32066666666666666 }],
            name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
          },
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [{ name: 'memory', value: 0.2346666666666667 }],
            name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
          },
        ]);
      });

      it('should return 3 hosts when filtered by "host.os.name=CentOS Linux"', async () => {
        const body: GetInfraMetricsRequestBodyPayload = {
          ...basePayload,
          metrics: [
            {
              type: 'cpu',
            },
          ],
          query: { bool: { filter: [{ term: { 'host.os.name': 'CentOS Linux' } }] } },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).eql([
          'gke-observability-8--observability-8--bc1afd95-ngmh',
          'gke-observability-8--observability-8--bc1afd95-f0zc',
          'gke-observability-8--observability-8--bc1afd95-nhhw',
        ]);
      });

      it('should return 0 hosts when filtered by "host.os.name=Ubuntu"', async () => {
        const body: GetInfraMetricsRequestBodyPayload = {
          ...basePayload,
          metrics: [
            {
              type: 'cpu',
            },
          ],
          query: { bool: { filter: [{ term: { 'host.os.name': 'Ubuntu' } }] } },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).eql([]);
      });
    });

    it('should return 0 hosts when filtered by not "host.name=gke-observability-8--observability-8--bc1afd95-nhhw"', async () => {
      const body: GetInfraMetricsRequestBodyPayload = {
        ...basePayload,
        metrics: [
          {
            type: 'cpu',
          },
        ],
        query: {
          bool: {
            must_not: [
              { term: { 'host.name': 'gke-observability-8--observability-8--bc1afd95-nhhw' } },
            ],
          },
        },
      };
      const response = await makeRequest({ body, expectedHTTPCode: 200 });

      const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
      expect(names).eql([
        'gke-observability-8--observability-8--bc1afd95-ngmh',
        'gke-observability-8--observability-8--bc1afd95-f0zc',
        ,
      ]);
    });

    describe('endpoint validations', () => {
      it('should fail when limit is 0', async () => {
        const body: GetInfraMetricsRequestBodyPayload = { ...basePayload, limit: 0 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: 0 does not match expected type InRange in limit: 0 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when limit is negative', async () => {
        const body: GetInfraMetricsRequestBodyPayload = { ...basePayload, limit: -2 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: -2 does not match expected type InRange in limit: -2 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when limit above 500', async () => {
        const body: GetInfraMetricsRequestBodyPayload = { ...basePayload, limit: 501 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: 501 does not match expected type InRange in limit: 501 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when metric is invalid', async () => {
        const invalidBody = { ...basePayload, metrics: [{ type: 'any' }] };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in metrics/0/type: "any" does not match expected type "cpu" | "normalizedLoad1m" | "diskSpaceUsage" | "memory" | "memoryFree" | "rx" | "tx"'
        );
      });

      it('should pass when limit is 1', async () => {
        const body: GetInfraMetricsRequestBodyPayload = { ...basePayload, limit: 1 };
        await makeRequest({ body, expectedHTTPCode: 200 });
      });

      it('should pass when limit is 500', async () => {
        const body: GetInfraMetricsRequestBodyPayload = { ...basePayload, limit: 500 };
        await makeRequest({ body, expectedHTTPCode: 200 });
      });

      it('should fail when range is not informed', async () => {
        const invalidBody = { ...basePayload, range: undefined };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in range: undefined does not match expected type { from: Date, to: Date }'
        );
      });
    });

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
          const body: GetInfraMetricsRequestBodyPayload = {
            ...basePayload,
            range: {
              from: '2018-10-17T19:42:21.208Z',
              to: '2018-10-17T19:58:03.952Z',
            },
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  GetHostsRequestBodyPayload,
  GetHostsResponsePayload,
} from '@kbn/infra-plugin/common/http_api/hosts';
import { DATES } from '../metrics_ui/constants';
import { FtrProviderContext } from '../../ftr_provider_context';

const ENDPOINT = '/api/metrics/hosts';

const normalizeNewLine = (text: string) => {
  return text.replaceAll('\n ', '');
};
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  const basePayload: GetHostsRequestBodyPayload = {
    limit: 10,
    metrics: [
      {
        type: 'cpu',
      },
      {
        type: 'diskLatency',
      },
      {
        type: 'memory',
      },
      {
        type: 'memoryTotal',
      },
      {
        type: 'rx',
      },
      {
        type: 'tx',
      },
    ],
    timeRange: {
      from: DATES['8.0.0'].logs_and_metrics.min,
      to: DATES['8.0.0'].logs_and_metrics.max,
    },
    query: { bool: { must_not: [], filter: [], should: [], must: [] } },
    sourceId: 'default',
  };

  const makeRequest = async ({
    body,
    invalidBody,
    expectedHTTPCode,
  }: {
    body?: GetHostsRequestBodyPayload;
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
        const body: GetHostsRequestBodyPayload = { ...basePayload, limit: 1 };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        expect(response.body.hosts).length(1);
        expect(response.body.hosts).eql([
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
            ],
            metrics: [
              { name: 'cpu', value: 0.44708333333333333 },
              { name: 'diskLatency', value: 0 },
              { name: 'memory', value: 0.4563333333333333 },
              { name: 'memoryTotal', value: 15768948736 },
              { name: 'rx', value: 0 },
              { name: 'tx', value: 0 },
            ],
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          },
        ]);
      });

      it('should sort all hosts sorted by cpu desc', async () => {
        const body: GetHostsRequestBodyPayload = {
          ...basePayload,
          metrics: [
            {
              type: 'cpu',
            },
          ],
          sortField: 'cpu',
          sortDirection: 'desc',
        };
        const response = await supertest
          .post(ENDPOINT)
          .set('kbn-xsrf', 'xxx')
          .send(body)
          .expect(200);

        expect(response.body.hosts).eql([
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
            ],
            metrics: [{ name: 'cpu', value: 0.6146666666666667 }],
            name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
          },
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
            ],
            metrics: [{ name: 'cpu', value: 0.44708333333333333 }],
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          },
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
            ],
            metrics: [{ name: 'cpu', value: 0.3514166666666667 }],
            name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
          },
        ]);
      });

      it('should return 1 host sorted by cpu desc', async () => {
        const body: GetHostsRequestBodyPayload = {
          ...basePayload,
          limit: 1,
          metrics: [
            {
              type: 'cpu',
            },
          ],
          sortField: 'cpu',
          sortDirection: 'desc',
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        expect(response.body.hosts).eql([
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
            ],
            metrics: [{ name: 'cpu', value: 0.6146666666666667 }],
            name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
          },
        ]);
      });

      it('should return 1 host sorted by memoryTotal asc', async () => {
        const body: GetHostsRequestBodyPayload = {
          ...basePayload,
          limit: 1,
          metrics: [
            {
              type: 'memoryTotal',
            },
          ],
          sortField: 'memoryTotal',
          sortDirection: 'asc',
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        expect(response.body.hosts).eql([
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
            ],
            metrics: [{ name: 'memoryTotal', value: 15768940544 }],
            name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
          },
        ]);
      });

      it('should return 3 hosts when filtered by "host.os.name=CentOS Linux"', async () => {
        const body: GetHostsRequestBodyPayload = {
          ...basePayload,
          metrics: [
            {
              type: 'cpu',
            },
          ],
          query: { bool: { filter: [{ term: { 'host.os.name': 'CentOS Linux' } }] } },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetHostsResponsePayload).hosts.map((p) => p.name);
        expect(names).eql([
          'gke-observability-8--observability-8--bc1afd95-f0zc',
          'gke-observability-8--observability-8--bc1afd95-ngmh',
          'gke-observability-8--observability-8--bc1afd95-nhhw',
        ]);
      });

      it('should return 0 hosts when filtered by "host.os.name=Ubuntu"', async () => {
        const body: GetHostsRequestBodyPayload = {
          ...basePayload,
          metrics: [
            {
              type: 'cpu',
            },
          ],
          query: { bool: { filter: [{ term: { 'host.os.name': 'Ubuntu' } }] } },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetHostsResponsePayload).hosts.map((p) => p.name);
        expect(names).eql([]);
      });
    });

    it('should return 0 hosts when filtered by not "host.name=gke-observability-8--observability-8--bc1afd95-nhhw"', async () => {
      const body: GetHostsRequestBodyPayload = {
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
      const response = await supertest.post(ENDPOINT).set('kbn-xsrf', 'xxx').send(body).expect(200);

      const names = (response.body as GetHostsResponsePayload).hosts.map((p) => p.name);
      expect(names).eql([
        'gke-observability-8--observability-8--bc1afd95-f0zc',
        'gke-observability-8--observability-8--bc1afd95-ngmh',
      ]);
    });

    describe('endpoint validations', () => {
      it('should fail when limit is 0', async () => {
        const body: GetHostsRequestBodyPayload = { ...basePayload, limit: 0 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate:  in limit: 0 does not match expected type LimitRange in limit: 0 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when limit is negative', async () => {
        const body: GetHostsRequestBodyPayload = { ...basePayload, limit: -2 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate:  in limit: -2 does not match expected type LimitRange in limit: -2 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when limit above 100', async () => {
        const body: GetHostsRequestBodyPayload = { ...basePayload, limit: 150 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate:  in limit: 150 does not match expected type LimitRange in limit: 150 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when metric is invalid', async () => {
        const invalidBody = { ...basePayload, metrics: [{ type: 'any' }] };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate:  in metrics/0/type: "any" does not match expected type "cpu" | "diskLatency" | "memory" | "memoryTotal" | "rx" | "tx"'
        );
      });

      it('should fail when sortDirection is invalid', async () => {
        const invalidBody = { ...basePayload, sortDirection: 'any' };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate:  in sortDirection: "any" does not match expected type "desc" in sortDirection: "any" does not match expected type "asc"'
        );
      });

      it('should fail when sortField is invalid', async () => {
        const invalidBody = { ...basePayload, sortField: 'any' };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate:  in sortField: "any" does not match expected type "name" | "cpu" | "diskLatency" | "memory" | "memoryTotal" | "rx" | "tx"'
        );
      });

      it('should fail when timeRange is not informed', async () => {
        const invalidBody = { ...basePayload, timeRange: undefined };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate:  in timeRange: undefined does not match expected type { from: number, to: number }'
        );
      });
    });
  });
}

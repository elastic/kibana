/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InfraSynthtraceEsClient } from '@kbn/synthtrace';
import type {
  GetInfraMetricsRequestBodyPayloadClient,
  GetInfraMetricsResponsePayload,
} from '@kbn/infra-plugin/common/http_api/infra';
import type { SupertestWithRoleScopeType } from '../../../services';
import { DATES } from '../utils/constants';
import {
  buildEcsAndSemconvWideTimerange,
  generateSemconvHostsData,
  SEMCONV_HOSTS,
  SEMCONV_HOSTS_DATA_FROM,
  SEMCONV_HOSTS_DATA_TO,
} from '../utils/semconv_hosts_data';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const ENDPOINT = '/api/metrics/infra/host';

const normalizeNewLine = (text: string) => {
  return text.replaceAll(/(\s{2,}|\\n\\s)/g, ' ');
};
export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

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
    schema: 'ecs',
  };

  describe('Hosts', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const makeRequest = async ({
      body,
      invalidBody,
      expectedHTTPCode,
    }: {
      body?: GetInfraMetricsRequestBodyPayloadClient;
      invalidBody?: any;
      expectedHTTPCode: number;
    }) => {
      return supertestWithAdminScope
        .post(ENDPOINT)
        .send(body ?? invalidBody)
        .expect(expectedHTTPCode);
    };

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
      });
    });
    after(async () => {
      await supertestWithAdminScope.destroy();
    });

    describe('Fetch hosts', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
        );
      });
      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
        );
      });

      it('should return metrics for a host', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 1 };
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
              { name: 'cpuV2', value: null },
              { name: 'diskSpaceUsage', value: null },
              { name: 'memory', value: 0.4563333333333333 },
              { name: 'memoryFree', value: 8573890560 },
              { name: 'normalizedLoad1m', value: 0.7375000000000002 },
              { name: 'rx', value: null },
              { name: 'tx', value: null },
            ],
            hasSystemMetrics: true,
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          },
        ]);
      });

      it('should return all hosts if query params is not sent', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['memory'],
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
            hasSystemMetrics: true,
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          },
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [{ name: 'memory', value: 0.32066666666666666 }],
            hasSystemMetrics: true,
            name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
          },
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [{ name: 'memory', value: 0.2346666666666667 }],
            hasSystemMetrics: true,
            name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
          },
        ]);
      });

      it('should return 3 hosts when filtered by "host.os.name=CentOS Linux"', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['cpuV2'],
          query: { bool: { filter: [{ term: { 'host.os.name': 'CentOS Linux' } }] } },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).eql([
          'gke-observability-8--observability-8--bc1afd95-f0zc',
          'gke-observability-8--observability-8--bc1afd95-ngmh',
          'gke-observability-8--observability-8--bc1afd95-nhhw',
        ]);
      });

      it('should return 0 hosts when filtered by "host.os.name=Ubuntu"', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['cpuV2'],
          query: { bool: { filter: [{ term: { 'host.os.name': 'Ubuntu' } }] } },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).eql([]);
      });

      it('should return 0 hosts when filtered by not "host.name=gke-observability-8--observability-8--bc1afd95-nhhw"', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['cpuV2'],
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
          'gke-observability-8--observability-8--bc1afd95-f0zc',
          'gke-observability-8--observability-8--bc1afd95-ngmh',
        ]);
      });
    });

    describe('Fetch hosts (semconv)', () => {
      let synthtraceClient: InfraSynthtraceEsClient | undefined;

      const semconvBasePayload: GetInfraMetricsRequestBodyPayloadClient = {
        limit: 10,
        // `rxV2` / `txV2` are intentionally omitted: the route rejects them when
        // `schema: 'semconv'`, see UNSUPPORTED_SEMCONV_METRICS in
        // x-pack/solutions/observability/plugins/infra/server/routes/infra/index.ts.
        metrics: ['cpuV2', 'diskSpaceUsage', 'memory', 'memoryFree', 'normalizedLoad1m'],
        from: SEMCONV_HOSTS_DATA_FROM,
        to: SEMCONV_HOSTS_DATA_TO,
        query: { bool: { must_not: [], filter: [], should: [], must: [] } },
        schema: 'semconv',
      };

      before(async () => {
        synthtraceClient = synthtrace.createInfraSynthtraceEsClient();
        await synthtraceClient.clean();
        await synthtraceClient.index(
          generateSemconvHostsData({
            from: SEMCONV_HOSTS_DATA_FROM,
            to: SEMCONV_HOSTS_DATA_TO,
            hosts: SEMCONV_HOSTS,
          })
        );
      });

      after(async () => {
        await synthtraceClient?.clean();
      });

      it('returns only OTel hosts (filtered by data_stream.dataset=hostmetricsreceiver.otel)', async () => {
        const response = await makeRequest({ body: semconvBasePayload, expectedHTTPCode: 200 });

        const names = (response.body as GetInfraMetricsResponsePayload).nodes
          .map((p) => p.name)
          .sort();
        expect(names).eql(SEMCONV_HOSTS.map((h) => h.hostName).sort());
      });

      it('reports hasSystemMetrics=true and computes core metrics for an OTel host', async () => {
        const response = await makeRequest({
          body: { ...semconvBasePayload, limit: 1 },
          expectedHTTPCode: 200,
        });
        const nodes = (response.body as GetInfraMetricsResponsePayload).nodes;

        expect(nodes).to.have.length(1);
        expect(nodes[0].hasSystemMetrics).to.be(true);

        const metricsByName = Object.fromEntries(nodes[0].metrics.map((m) => [m.name, m.value]));
        // cpuV2 / memory derive from semconv state-based aggregations populated
        // by `infra.semconvHost(...).cpu()` / `.memory()`.
        expect(metricsByName.cpuV2).to.be.a('number');
        expect(metricsByName.memory).to.be.a('number');
      });

      // Mirrors the exact error thrown by `UNSUPPORTED_SEMCONV_METRICS` in
      // x-pack/solutions/observability/plugins/infra/server/routes/infra/index.ts
      // so an unrelated 400 (e.g. unrelated body validation) cannot accidentally
      // satisfy this assertion.
      const unsupportedSemconvMessage = (metric: 'rxV2' | 'txV2') =>
        `The following metrics are not supported for semconv schema: ${metric}`;

      it('rejects rxV2 with 400 when schema=semconv', async () => {
        const response = await makeRequest({
          body: { ...semconvBasePayload, metrics: ['rxV2'] },
          expectedHTTPCode: 400,
        });
        expect(normalizeNewLine(response.body.message)).to.equal(unsupportedSemconvMessage('rxV2'));
      });

      it('rejects txV2 with 400 when schema=semconv', async () => {
        const response = await makeRequest({
          body: { ...semconvBasePayload, metrics: ['txV2'] },
          expectedHTTPCode: 400,
        });
        expect(normalizeNewLine(response.body.message)).to.equal(unsupportedSemconvMessage('txV2'));
      });

      it('returns only the queried OTel host when filtered by host.name', async () => {
        const targetHost = SEMCONV_HOSTS[0].hostName;
        const response = await makeRequest({
          body: {
            ...semconvBasePayload,
            metrics: ['cpuV2'],
            query: { bool: { filter: [{ term: { 'host.name': targetHost } }] } },
          },
          expectedHTTPCode: 200,
        });
        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).eql([targetHost]);
      });
    });

    // These mixed-schema cases cover the cohort split when ECS-archived hosts
    // and OTel synthtrace hosts coexist in the cluster. They do NOT cover
    // *dual-shipping* (the same `host.name` ingested through both pipelines);
    // see issue #264011 for tracking.
    describe('Mixed ECS + semconv hosts', () => {
      let synthtraceClient: InfraSynthtraceEsClient | undefined;
      let archiveLoaded = false;

      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
        );
        archiveLoaded = true;
        synthtraceClient = synthtrace.createInfraSynthtraceEsClient();
        await synthtraceClient.clean();
        await synthtraceClient.index(
          generateSemconvHostsData({
            from: SEMCONV_HOSTS_DATA_FROM,
            to: SEMCONV_HOSTS_DATA_TO,
            hosts: SEMCONV_HOSTS,
          })
        );
      });

      after(async () => {
        try {
          await synthtraceClient?.clean();
        } finally {
          if (archiveLoaded) {
            await esArchiver.unload(
              'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
            );
          }
        }
      });

      const wideTimerange = buildEcsAndSemconvWideTimerange({
        ecsFromMs: DATES['8.0.0'].logs_and_metrics.min,
        ecsToMs: DATES['8.0.0'].logs_and_metrics.max,
      });

      it('returns only ECS hosts when schema=ecs', async () => {
        const response = await makeRequest({
          body: {
            ...basePayload,
            metrics: ['cpuV2'],
            ...wideTimerange,
            schema: 'ecs',
          },
          expectedHTTPCode: 200,
        });
        const names = (response.body as GetInfraMetricsResponsePayload).nodes
          .map((p) => p.name)
          .sort();

        expect(names).to.eql([
          'gke-observability-8--observability-8--bc1afd95-f0zc',
          'gke-observability-8--observability-8--bc1afd95-ngmh',
          'gke-observability-8--observability-8--bc1afd95-nhhw',
        ]);
        for (const name of names) {
          expect(SEMCONV_HOSTS.map((h) => h.hostName)).not.to.contain(name);
        }
      });

      it('returns only OTel hosts when schema=semconv', async () => {
        const response = await makeRequest({
          body: {
            limit: 10,
            metrics: ['cpuV2'],
            ...wideTimerange,
            query: { bool: { must_not: [], filter: [], should: [], must: [] } },
            schema: 'semconv',
          },
          expectedHTTPCode: 200,
        });
        const names = (response.body as GetInfraMetricsResponsePayload).nodes
          .map((p) => p.name)
          .sort();

        expect(names).to.eql(SEMCONV_HOSTS.map((h) => h.hostName).sort());
      });
    });

    describe('Endpoint validations', () => {
      it('should fail when limit is 0', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 0 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: 0 does not match expected type InRange in limit: 0 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when limit is negative', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: -2 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: -2 does not match expected type InRange in limit: -2 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when limit above 500', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 501 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: 501 does not match expected type InRange in limit: 501 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when metric is invalid', async () => {
        const invalidBody = { ...basePayload, metrics: ['any'] };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in metrics/0: "any" does not match expected type "cpu" | "cpuV2" | "normalizedLoad1m" | "diskSpaceUsage" | "memory" | "memoryFree" | "rx" | "tx" | "rxV2" | "txV2"'
        );
      });

      it('should pass when limit is 1', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 1 };
        await makeRequest({ body, expectedHTTPCode: 200 });
      });

      it('should pass when limit is 500', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 500 };
        await makeRequest({ body, expectedHTTPCode: 200 });
      });

      it('should fail when from and to are not informed', async () => {
        const invalidBody = { ...basePayload, from: undefined, to: undefined };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in from: undefined does not match expected type isoToEpochRt in to: undefined does not match expected type isoToEpochRt'
        );
      });
    });
  });
}

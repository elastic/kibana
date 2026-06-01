/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { InfraSynthtraceEsClient } from '@kbn/synthtrace';
import { infra, timerange } from '@kbn/synthtrace-client';
import type { GetHostsKpisResponsePayload } from '@kbn/infra-plugin/common/http_api/infra';
import type { SupertestWithRoleScopeType } from '../../../services';
import {
  generateSemconvHostsData,
  SEMCONV_HOSTS,
  SEMCONV_HOSTS_DATA_FROM,
  SEMCONV_HOSTS_DATA_TO,
} from '../utils/semconv_hosts_data';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const ENDPOINT = '/api/metrics/infra/host/kpis';

// ECS fleet seeded with `infra.host(...)`. The generator uses deterministic
// defaults (see `kbn-synthtrace-client/src/lib/infra/host.ts`), so the
// fleet-level KPIs are exact:
//   cpuUsage         = avg(system.cpu.total.norm.pct)        = 0.98
//   memoryUsage      = avg(system.memory.actual.used.pct)    = 0.35
//   normalizedLoad1m = avg(system.load.1) / max(system.load.cores) = 3 / 16
//   diskUsage        = max(system.filesystem.used.pct)       = 12.23
const ECS_HOSTS = ['ecs-host-1', 'ecs-host-2', 'ecs-host-3'];
const ECS_DATA_FROM = '2024-02-01T00:00:00.000Z';
const ECS_DATA_TO = '2024-02-01T00:10:00.000Z';

const generateEcsHostsData = () => {
  const range = timerange(ECS_DATA_FROM, ECS_DATA_TO);
  const hosts = ECS_HOSTS.map((name) => infra.host(name));

  return range
    .interval('30s')
    .rate(1)
    .generator((timestamp) =>
      hosts.flatMap((host) =>
        [host.cpu(), host.memory(), host.load(), host.filesystem()].map((metric) =>
          metric.timestamp(timestamp)
        )
      )
    );
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const synthtrace = getService('synthtrace');

  describe('Host KPIs', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const fetchKpis = async ({
      body,
      expectedHTTPCode = 200,
    }: {
      body: Record<string, unknown>;
      expectedHTTPCode?: number;
    }) => {
      return supertestWithAdminScope.post(ENDPOINT).send(body).expect(expectedHTTPCode);
    };

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
      });
    });
    after(async () => {
      await supertestWithAdminScope.destroy();
    });

    describe('semconv (ES|QL path)', () => {
      let synthtraceClient: InfraSynthtraceEsClient | undefined;

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

      it('computes the four fleet KPIs over the semconv fleet', async () => {
        const response = await fetchKpis({
          body: {
            from: SEMCONV_HOSTS_DATA_FROM,
            to: SEMCONV_HOSTS_DATA_TO,
            schema: 'semconv',
          },
        });

        const { entityType, kpis, hostCount } = response.body as GetHostsKpisResponsePayload;

        expect(entityType).to.be('host');
        expect(hostCount).to.be(SEMCONV_HOSTS.length);

        // Ranges mirror the `SemconvHost` generator (randomised within bounds):
        //   cpuUsage = 1 - idle, idle ∈ [0.3, 0.7]            → [0.3, 0.7]
        //   normalizedLoad1m = load1m / cores, load1m ∈ [1, 4], cores = 4 → [0.25, 1]
        //   memoryUsage = used / total, used ∈ [0.4, 0.7]     → [0.4, 0.7]
        //   diskUsage = used / total fs bytes, used ∈ [0.3, 0.7] → [0.3, 0.7]
        expect(kpis.cpuUsage).to.be.within(0.3, 0.7);
        expect(kpis.normalizedLoad1m).to.be.within(0.25, 1);
        expect(kpis.memoryUsage).to.be.within(0.4, 0.7);
        expect(kpis.diskUsage).to.be.within(0.3, 0.7);
      });

      it('narrows hostCount when filtered by host.name', async () => {
        const targetHost = SEMCONV_HOSTS[0].hostName;
        const response = await fetchKpis({
          body: {
            from: SEMCONV_HOSTS_DATA_FROM,
            to: SEMCONV_HOSTS_DATA_TO,
            schema: 'semconv',
            query: { bool: { filter: [{ term: { 'host.name': targetHost } }] } },
          },
        });

        const { hostCount } = response.body as GetHostsKpisResponsePayload;
        expect(hostCount).to.be(1);
      });

      it('returns null KPIs and hostCount 0 when no documents fall in range', async () => {
        const response = await fetchKpis({
          body: {
            from: '2020-01-01T00:00:00.000Z',
            to: '2020-01-01T00:10:00.000Z',
            schema: 'semconv',
          },
        });

        const { kpis, hostCount } = response.body as GetHostsKpisResponsePayload;
        expect(hostCount).to.be(0);
        expect(kpis.cpuUsage).to.be(null);
        expect(kpis.normalizedLoad1m).to.be(null);
        expect(kpis.memoryUsage).to.be(null);
        expect(kpis.diskUsage).to.be(null);
      });
    });

    describe('ecs (DSL path)', () => {
      let synthtraceClient: InfraSynthtraceEsClient | undefined;

      before(async () => {
        synthtraceClient = synthtrace.createInfraSynthtraceEsClient();
        await synthtraceClient.clean();
        await synthtraceClient.index(generateEcsHostsData());
      });

      after(async () => {
        await synthtraceClient?.clean();
      });

      it('computes the deterministic fleet KPIs over the ECS fleet', async () => {
        const response = await fetchKpis({
          body: {
            from: ECS_DATA_FROM,
            to: ECS_DATA_TO,
            schema: 'ecs',
          },
        });

        const { entityType, kpis, hostCount } = response.body as GetHostsKpisResponsePayload;

        expect(entityType).to.be('host');
        expect(hostCount).to.be(ECS_HOSTS.length);

        // `within` (not exact) to absorb floating-point representation only.
        expect(kpis.cpuUsage).to.be.within(0.9799, 0.9801);
        expect(kpis.memoryUsage).to.be.within(0.3499, 0.3501);
        expect(kpis.normalizedLoad1m).to.be.within(0.1874, 0.1876); // 3 / 16
        expect(kpis.diskUsage).to.be.within(12.2299, 12.2301);
      });

      it('narrows hostCount when filtered by host.name', async () => {
        const response = await fetchKpis({
          body: {
            from: ECS_DATA_FROM,
            to: ECS_DATA_TO,
            schema: 'ecs',
            query: { bool: { filter: [{ term: { 'host.name': ECS_HOSTS[0] } }] } },
          },
        });

        const { hostCount } = response.body as GetHostsKpisResponsePayload;
        expect(hostCount).to.be(1);
      });
    });

    describe('validation', () => {
      it('rejects a request that omits from/to', async () => {
        await fetchKpis({ body: { schema: 'semconv' }, expectedHTTPCode: 400 });
      });
    });
  });
}

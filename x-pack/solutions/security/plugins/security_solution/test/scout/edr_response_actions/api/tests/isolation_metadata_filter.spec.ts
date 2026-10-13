/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_HEADERS, PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  AGENT_STATUS_ROUTE,
  HOST_METADATA_LIST_ROUTE,
} from '../../../../../common/endpoint/constants';
import { getResponseActionsAccessRole } from '../../ui/fixtures/response_actions_access_role';
import { apiTest, tags } from '../fixtures';
import { seedEndpointHosts, type SeededEndpointHosts } from '../../common/seed_endpoint_hosts';

interface MetadataListBody {
  data: Array<{ metadata: { agent: { id: string } } }>;
  total: number;
}

interface AgentStatusBody {
  data: Record<string, { isolated: boolean }>;
}

const agentIdFilter = (agentIds: readonly string[]): string =>
  agentIds.map((agentId) => `united.endpoint.agent.id: "${agentId}"`).join(' or ');

apiTest.describe(
  'Endpoint isolation metadata',
  {
    tag: tags.stateful.classic,
  },
  () => {
    let isolatedHosts: SeededEndpointHosts | undefined;
    let unisolatedHosts: SeededEndpointHosts | undefined;
    let metadataHeaders: Record<string, string>;
    let agentStatusHeaders: Record<string, string>;

    const requireHosts = (seeded: SeededEndpointHosts | undefined, label: string) => {
      if (!seeded) {
        throw new Error(`${label} were not seeded`);
      }
      return seeded;
    };

    apiTest.beforeAll(async ({ esClient, kbnClient, config, requestAuth, samlAuth }) => {
      // Two host seeds each wait up to 4 minutes for the current index and 4 for the united index.
      apiTest.setTimeout(1_200_000);
      const role = getResponseActionsAccessRole();
      const [{ apiKeyHeader }, { cookieHeader }] = await Promise.all([
        requestAuth.getApiKeyForCustomRole(role),
        samlAuth.asInteractiveUser(role),
      ]);
      metadataHeaders = { ...apiKeyHeader, ...PUBLIC_API_HEADERS };
      agentStatusHeaders = { ...cookieHeader, ...INTERNAL_API_HEADERS };

      isolatedHosts = await seedEndpointHosts({
        esClient,
        kbnClient,
        spaceId: 'default',
        config,
        count: 2,
        isolation: true,
      });
      unisolatedHosts = await seedEndpointHosts({
        esClient,
        kbnClient,
        spaceId: 'default',
        config,
        count: 2,
        isolation: false,
      });
    });

    apiTest.afterAll(async () => {
      const failures: unknown[] = [];
      for (const seeded of [unisolatedHosts, isolatedHosts]) {
        try {
          await seeded?.cleanup();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length === 1) {
        throw failures[0];
      }
      if (failures.length > 1) {
        throw new AggregateError(failures, 'Failed to clean up seeded endpoint hosts');
      }
    });

    apiTest(
      'returns only hosts whose isolation state matches the KQL filter',
      async ({ apiClient }) => {
        const isolated = requireHosts(isolatedHosts, 'Isolated hosts');
        const unisolated = requireHosts(unisolatedHosts, 'Unisolated hosts');
        const isolatedIds = isolated.hosts.map((host) => host.agentId);
        const unisolatedIds = unisolated.hosts.map((host) => host.agentId);
        const allIds = [...isolatedIds, ...unisolatedIds];

        const allHosts = await apiClient.get(
          `${HOST_METADATA_LIST_ROUTE}?${new URLSearchParams({
            kuery: agentIdFilter(allIds),
            page: '0',
            pageSize: '50',
          })}`,
          { headers: metadataHeaders, responseType: 'json' }
        );
        expect(allHosts).toHaveStatusCode(200);
        const allBody = allHosts.body as MetadataListBody;
        expect(allBody.data.map((host) => host.metadata.agent.id).sort()).toStrictEqual(
          [...allIds].sort()
        );

        const isolatedOnly = await apiClient.get(
          `${HOST_METADATA_LIST_ROUTE}?${new URLSearchParams({
            kuery: `united.endpoint.Endpoint.state.isolation: true and (${agentIdFilter(allIds)})`,
            page: '0',
            pageSize: '50',
          })}`,
          { headers: metadataHeaders, responseType: 'json' }
        );
        expect(isolatedOnly).toHaveStatusCode(200);
        const isolatedBody = isolatedOnly.body as MetadataListBody;
        expect(isolatedBody.total).toBe(isolatedIds.length);
        expect(isolatedBody.data.map((host) => host.metadata.agent.id).sort()).toStrictEqual(
          [...isolatedIds].sort()
        );
      }
    );

    apiTest('reports agent status isolation from endpoint metadata', async ({ apiClient }) => {
      const isolated = requireHosts(isolatedHosts, 'Isolated hosts');
      const unisolated = requireHosts(unisolatedHosts, 'Unisolated hosts');
      const params = new URLSearchParams({ agentType: 'endpoint' });
      for (const host of [...isolated.hosts, ...unisolated.hosts]) {
        params.append('agentIds', host.agentId);
      }

      const response = await apiClient.get(`${AGENT_STATUS_ROUTE}?${params}`, {
        headers: agentStatusHeaders,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);

      const body = response.body as AgentStatusBody;
      for (const host of isolated.hosts) {
        expect(body.data[host.agentId]?.isolated).toBe(true);
      }
      for (const host of unisolated.hosts) {
        expect(body.data[host.agentId]?.isolated).toBe(false);
      }
    });
  }
);

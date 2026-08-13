/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  COMMON_HEADERS,
  CRIBL_ROUTING_PIPELINE,
  FLEET_ALL_NO_PIPELINE_ROLE,
} from '../fixtures/constants';

const VALID_DATA_ID = 'criblSourceScout1';
const UPDATED_DATA_ID = 'criblSourceScout2';
const INVALID_DATA_ID = `x' || true || 'y`;
const DATASTREAM = 'logs-destination1.cloud';

const buildRouteEntries = (dataId: string): string =>
  JSON.stringify([{ dataId, datastream: DATASTREAM }]);

apiTest.describe('Cribl routing pipeline', { tag: [...tags.stateful.classic] }, () => {
  let adminHeaders: Record<string, string>;
  let fleetNoPipelineHeaders: Record<string, string>;
  let criblPackageVersion = '';
  let agentPolicyId = '';
  let packagePolicyId = '';

  const deletePipelineIfExists = async (
    esClient: {
      transport: { request: (opts: Record<string, unknown>) => Promise<unknown> };
    },
    log: { debug: (msg: string) => void }
  ) => {
    try {
      await esClient.transport.request({
        method: 'DELETE',
        path: `_ingest/pipeline/${CRIBL_ROUTING_PIPELINE}`,
      });
    } catch (error) {
      log.debug(`Pipeline cleanup skipped: ${(error as Error).message}`);
    }
  };

  const getPipeline = async (esClient: {
    transport: { request: (opts: Record<string, unknown>) => Promise<unknown> };
  }) => {
    return esClient.transport.request({
      method: 'GET',
      path: `_ingest/pipeline/${CRIBL_ROUTING_PIPELINE}`,
    }) as Promise<Record<string, { processors?: Array<{ reroute?: { if?: string } }> }>>;
  };

  const createCriblPackagePolicyBody = (params: {
    name: string;
    agentPolicyId: string;
    dataId: string;
  }) => ({
    policy_ids: [params.agentPolicyId],
    package: { name: 'cribl', version: criblPackageVersion },
    name: params.name,
    description: '',
    namespace: 'default',
    inputs: {},
    vars: {
      route_entries: {
        type: 'textarea',
        value: buildRouteEntries(params.dataId),
      },
    },
  });

  apiTest.beforeAll(async ({ samlAuth, requestAuth, apiClient, esClient, log }) => {
    apiTest.setTimeout(300_000);

    const adminCredentials = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...adminCredentials.cookieHeader, ...COMMON_HEADERS };

    const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(FLEET_ALL_NO_PIPELINE_ROLE);
    fleetNoPipelineHeaders = { ...apiKeyHeader, ...COMMON_HEADERS };

    const packageInfoRes = await apiClient.get('/api/fleet/epm/packages/cribl', {
      headers: adminHeaders,
      responseType: 'json',
    });
    expect(packageInfoRes).toHaveStatusCode(200);
    criblPackageVersion = packageInfoRes.body?.item?.version;
    expect(criblPackageVersion).toBeTruthy();

    // Ensure package assets are installed before creating policies.
    await apiClient
      .post(`/api/fleet/epm/packages/cribl/${criblPackageVersion}`, {
        headers: adminHeaders,
        responseType: 'json',
        body: { force: true },
      })
      .catch(() => undefined);

    await deletePipelineIfExists(esClient, log);

    const agentPolicyRes = await apiClient.post('/api/fleet/agent_policies?sys_monitoring=true', {
      headers: adminHeaders,
      responseType: 'json',
      body: {
        name: `cribl-scout-agent-policy-${Date.now()}`,
        description: '',
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
      },
    });
    expect(agentPolicyRes).toHaveStatusCode(200);
    agentPolicyId = agentPolicyRes.body?.item?.id;
    expect(agentPolicyId).toBeTruthy();
  });

  apiTest.afterAll(async ({ apiClient, esClient, log }) => {
    if (packagePolicyId) {
      await apiClient
        .post('/api/fleet/package_policies/delete', {
          headers: adminHeaders,
          responseType: 'json',
          body: { packagePolicyIds: [packagePolicyId] },
        })
        .catch(() => undefined);
    }

    if (agentPolicyId) {
      await apiClient
        .post('/api/fleet/agent_policies/delete', {
          headers: adminHeaders,
          responseType: 'json',
          body: { agentPolicyId },
        })
        .catch(() => undefined);
    }

    await deletePipelineIfExists(esClient, log);
  });

  apiTest(
    'creates the routing pipeline with an exact dataId condition',
    async ({ apiClient, esClient }) => {
      const createRes = await apiClient.post('/api/fleet/package_policies', {
        headers: adminHeaders,
        responseType: 'json',
        body: createCriblPackagePolicyBody({
          name: `cribl-scout-${Date.now()}`,
          agentPolicyId,
          dataId: VALID_DATA_ID,
        }),
      });

      expect(createRes.statusCode).toBeLessThan(300);
      packagePolicyId = createRes.body?.item?.id;
      expect(packagePolicyId).toBeTruthy();

      const pipeline = await getPipeline(esClient);
      const processors = pipeline[CRIBL_ROUTING_PIPELINE]?.processors ?? [];
      expect(processors.some((p) => p.reroute?.if === `ctx['_dataId'] == '${VALID_DATA_ID}'`)).toBe(
        true
      );
    }
  );

  apiTest(
    'updates the routing pipeline when route entries change',
    async ({ apiClient, esClient }) => {
      expect(packagePolicyId).toBeTruthy();

      const currentRes = await apiClient.get(`/api/fleet/package_policies/${packagePolicyId}`, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(currentRes).toHaveStatusCode(200);
      const current = currentRes.body.item;

      const updateRes = await apiClient.put(`/api/fleet/package_policies/${packagePolicyId}`, {
        headers: adminHeaders,
        responseType: 'json',
        body: {
          name: current.name,
          description: current.description,
          namespace: current.namespace,
          policy_ids: current.policy_ids,
          enabled: current.enabled,
          package: current.package,
          inputs: current.inputs,
          vars: {
            ...current.vars,
            route_entries: {
              type: 'textarea',
              value: buildRouteEntries(UPDATED_DATA_ID),
            },
          },
        },
      });

      expect(updateRes.statusCode).toBeLessThan(300);

      const pipeline = await getPipeline(esClient);
      const processors = pipeline[CRIBL_ROUTING_PIPELINE]?.processors ?? [];
      expect(
        processors.some((p) => p.reroute?.if === `ctx['_dataId'] == '${UPDATED_DATA_ID}'`)
      ).toBe(true);
      expect(processors.some((p) => p.reroute?.if === `ctx['_dataId'] == '${VALID_DATA_ID}'`)).toBe(
        false
      );
    }
  );

  apiTest(
    'rejects invalid dataId values and leaves the pipeline unchanged',
    async ({ apiClient, esClient }) => {
      expect(packagePolicyId).toBeTruthy();
      const before = await getPipeline(esClient);

      const currentRes = await apiClient.get(`/api/fleet/package_policies/${packagePolicyId}`, {
        headers: adminHeaders,
        responseType: 'json',
      });
      expect(currentRes).toHaveStatusCode(200);
      const current = currentRes.body.item;

      const updateRes = await apiClient.put(`/api/fleet/package_policies/${packagePolicyId}`, {
        headers: adminHeaders,
        responseType: 'json',
        body: {
          name: current.name,
          description: current.description,
          namespace: current.namespace,
          policy_ids: current.policy_ids,
          enabled: current.enabled,
          package: current.package,
          inputs: current.inputs,
          vars: {
            ...current.vars,
            route_entries: {
              type: 'textarea',
              value: buildRouteEntries(INVALID_DATA_ID),
            },
          },
        },
      });

      expect(updateRes.statusCode).toBeGreaterThanOrEqual(400);

      const after = await getPipeline(esClient);
      expect(after[CRIBL_ROUTING_PIPELINE]).toStrictEqual(before[CRIBL_ROUTING_PIPELINE]);
    }
  );

  apiTest(
    'rejects create when the caller lacks ingest pipeline privileges',
    async ({ apiClient, esClient, log }) => {
      await deletePipelineIfExists(esClient, log);

      const createRes = await apiClient.post('/api/fleet/package_policies', {
        headers: fleetNoPipelineHeaders,
        responseType: 'json',
        body: createCriblPackagePolicyBody({
          name: `cribl-scout-noprivs-${Date.now()}`,
          agentPolicyId,
          dataId: VALID_DATA_ID,
        }),
      });

      expect(createRes.statusCode).toBeGreaterThanOrEqual(400);

      await expect(getPipeline(esClient)).rejects.toBeTruthy();
    }
  );
});

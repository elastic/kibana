/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { apiTest as base } from '@kbn/scout-oblt';
import { COLLECTOR_PACKAGE_POLICY_NAME, SYMBOLIZER_PACKAGE_POLICY_NAME } from './constants';

export interface ProfilingHelper {
  installPolicies: () => Promise<void>;
  cleanupPolicies: (opts?: { includeAgentPolicy?: boolean }) => Promise<void>;
  getPolicyIds: () => Promise<{ collectorId?: string; symbolizerId?: string }>;
}

const APM_AGENT_POLICY_ID = 'policy-elastic-agent-on-cloud';

export const apiTest = base.extend<{}, { profilingHelper: ProfilingHelper }>({
  profilingHelper: [
    async ({ apiServices, log }, use) => {
      const installPolicies = async (): Promise<void> => {
        // Guard against the `ingest_manager_settings` SO being deleted by an unrelated
        // suite's `cleanStandardList()` between global setup and this spec. Without this,
        // Fleet's space-awareness check flips and the agent policy gets written under the
        // legacy SO type, causing setupResources() to 404 on `policy-elastic-agent-on-cloud`.
        // See https://github.com/elastic/kibana/issues/248929.
        await apiServices.fleet.internal.setup();

        log.info('Checking if APM agent policy exists, creating if needed...');
        const getPolicyResponse = await apiServices.fleet.agent_policies.get({
          page: 1,
          perPage: 1000,
        });
        const apmPolicyData = getPolicyResponse.data.items.find(
          (policy: { id: string }) => policy.id === APM_AGENT_POLICY_ID
        );

        if (!apmPolicyData) {
          await apiServices.fleet.agent_policies.create({
            policyName: 'Elastic APM',
            policyNamespace: 'default',
            sysMonitoring: false,
            params: {
              id: APM_AGENT_POLICY_ID,
              description: 'Elastic APM agent policy created via Fleet API',
            },
          });
          log.info(`APM agent policy '${APM_AGENT_POLICY_ID}' is created`);
        } else {
          log.info(`APM agent policy '${APM_AGENT_POLICY_ID}' already exists`);
        }
      };

      const cleanupPolicies = async (
        opts: { includeAgentPolicy?: boolean } = {}
      ): Promise<void> => {
        const { includeAgentPolicy = false } = opts;
        log.info('Cleaning up profiling resources...');

        const res = await apiServices.fleet.package_policies.get({ perPage: 1000 });
        const packagePolicies: PackagePolicy[] = res.data.items;

        const collectorId = packagePolicies.find(
          (item) => item.name === COLLECTOR_PACKAGE_POLICY_NAME
        )?.id;
        const symbolizerId = packagePolicies.find(
          (item) => item.name === SYMBOLIZER_PACKAGE_POLICY_NAME
        )?.id;

        let apmPolicyPromise = Promise.resolve();
        if (includeAgentPolicy) {
          const getPolicyResponse = await apiServices.fleet.agent_policies.get({
            page: 1,
            perPage: 1000,
          });
          const agentPolicies: AgentPolicy[] = getPolicyResponse.data.items;
          const apmId = agentPolicies.find(
            (policy: { id: string }) => policy.id === APM_AGENT_POLICY_ID
          )?.id;

          if (apmId) {
            apmPolicyPromise = apiServices.fleet.agent_policies.delete(apmId);
          }
        }

        await Promise.all([
          collectorId ? apiServices.fleet.package_policies.delete(collectorId) : Promise.resolve(),
          symbolizerId
            ? apiServices.fleet.package_policies.delete(symbolizerId)
            : Promise.resolve(),
          apmPolicyPromise,
        ]);

        log.info('Profiling resources cleaned up');
      };

      const getPolicyIds = async (): Promise<{ collectorId?: string; symbolizerId?: string }> => {
        const res = await apiServices.fleet.package_policies.get({ perPage: 1000 });
        const policies: PackagePolicy[] = res.data.items;

        const collector = policies.find((item) => item.name === COLLECTOR_PACKAGE_POLICY_NAME);
        const symbolizer = policies.find((item) => item.name === SYMBOLIZER_PACKAGE_POLICY_NAME);

        return {
          collectorId: collector?.id,
          symbolizerId: symbolizer?.id,
        };
      };
      await use({
        installPolicies,
        cleanupPolicies,
        getPolicyIds,
      });
    },
    { scope: 'worker' },
  ],
});

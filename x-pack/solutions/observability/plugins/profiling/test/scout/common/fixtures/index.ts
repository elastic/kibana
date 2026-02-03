/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { apiTest as base } from '@kbn/scout-oblt';
import { COLLECTOR_PACKAGE_POLICY_NAME, SYMBOLIZER_PACKAGE_POLICY_NAME } from './constants';

export interface ProfilingHelper {
  installPolicies: () => Promise<void>;
  cleanupPolicies: () => Promise<void>;
  getPoliciyIds: () => Promise<{ collectorId?: string; symbolizerId?: string }>;
}

const APM_AGENT_POLICY_ID = 'policy-elastic-agent-on-cloud';

export const apiTest = base.extend<{}, { profilingHelper: ProfilingHelper }>({
  profilingHelper: [
    async ({ apiServices, log }, use) => {
      const installPolicies = async (): Promise<void> => {
        log.info('Checking if APM agent policy exists, creating if needed...');
        const getPolicyResponse = await apiServices.fleet.agent_policies.get({
          page: 1,
          perPage: 10,
        });
        const apmPolicyData = getPolicyResponse.data.items.find(
          (policy: { id: string }) => policy.id === 'policy-elastic-agent-on-cloud'
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
      const cleanupPolicies = async (): Promise<void> => {
        log.info('Cleaning up profiling resources...');

        const res = await apiServices.fleet.package_policies.get();
        const policies: PackagePolicy[] = res.data.items;

        const collectorId = policies.find(
          (item) => item.name === 'elastic-universal-profiling-collector'
        )?.id;
        const symbolizerId = policies.find(
          (item) => item.name === 'elastic-universal-profiling-symbolizer'
        )?.id;

        await Promise.all([
          collectorId ? apiServices.fleet.package_policies.delete(collectorId) : Promise.resolve(),
          symbolizerId
            ? apiServices.fleet.package_policies.delete(symbolizerId)
            : Promise.resolve(),
        ]);
      };

      const getPoliciyIds = async (): Promise<{ collectorId?: string; symbolizerId?: string }> => {
        const res = await apiServices.fleet.package_policies.get();
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
        getPoliciyIds,
      });
    },
    { scope: 'worker' },
  ],
});

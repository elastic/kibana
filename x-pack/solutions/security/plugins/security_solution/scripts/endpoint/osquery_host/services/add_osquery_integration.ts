/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  fetchPackageInfo,
  createIntegrationPolicy,
  installIntegration,
  fetchAgentPolicy,
} from '../../common/fleet_services';

interface AddOsqueryIntegrationOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  agentPolicyId: string;
  integrationPolicyName?: string;
  force?: boolean;
}

/**
 * Adds the osquery_manager integration to an agent policy.
 * The integration comes with prebuilt saved queries that can be used.
 *
 * @param options Configuration options
 * @returns The created PackagePolicy
 */
export const addOsqueryIntegrationToAgentPolicy = async ({
  kbnClient,
  log,
  agentPolicyId,
  integrationPolicyName = `osquery-integration-${Math.random().toString().substring(2, 6)}`,
  force = false,
}: AddOsqueryIntegrationOptions): Promise<PackagePolicy> => {
  // If `force` is `false` and agent policy already has an Osquery integration, exit here
  if (!force) {
    log.debug(
      `Checking to see if agent policy [${agentPolicyId}] already includes an Osquery integration policy`
    );
    const agentPolicy = await fetchAgentPolicy(kbnClient, agentPolicyId);
    log.verbose(agentPolicy);
    const integrationPolicies = agentPolicy.package_policies ?? [];

    for (const integrationPolicy of integrationPolicies) {
      if (integrationPolicy.package?.name === 'osquery_manager') {
        log.debug(
          `Returning existing Osquery Integration Policy included in agent policy [${agentPolicyId}]`
        );
        return integrationPolicy;
      }
    }
  }

  // Try to get package info, install if not available
  let packageInfo;
  try {
    packageInfo = await fetchPackageInfo(kbnClient, 'osquery_manager');
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      log.info('Osquery package not found, installing it first...');
      await installIntegration(kbnClient, 'osquery_manager');
      packageInfo = await fetchPackageInfo(kbnClient, 'osquery_manager');
    } else {
      throw error;
    }
  }

  const { version: packageVersion, name: packageName } = packageInfo;

  log.debug(
    `Creating new Osquery integration policy [package v${packageVersion}] and adding it to agent policy [${agentPolicyId}]`
  );

  return createIntegrationPolicy(kbnClient, {
    name: integrationPolicyName,
    description: `Osquery Manager integration. Created by script: ${__filename}`,
    policy_id: agentPolicyId,
    policy_ids: [agentPolicyId],
    enabled: true,
    package: {
      name: packageName,
      version: packageVersion,
      title: packageInfo.title || 'Osquery Manager',
    },
    inputs: [
      {
        type: 'osquery',
        policy_template: 'osquery_manager',
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'osquery_manager.result',
            },
          },
          {
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'osquery_manager.action.responses',
            },
          },
        ],
      },
    ],
  });
};

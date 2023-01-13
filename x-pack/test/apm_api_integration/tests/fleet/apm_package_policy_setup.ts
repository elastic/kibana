/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PackagePolicy, NewPackagePolicy, AgentPolicy } from '@kbn/fleet-plugin/common';
import { BetterTest } from '../../common/bettertest';

export function setupFleet(bettertest: BetterTest) {
  return bettertest({ pathname: '/api/fleet/setup', method: 'post' });
}

export async function createAgentPolicy(bettertest: BetterTest) {
  const agentPolicyResponse = await bettertest<{ item: AgentPolicy }>({
    pathname: '/api/fleet/agent_policies',
    method: 'post',
    query: { sys_monitoring: true },
    body: {
      name: 'test_agent_policy',
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    },
  });

  return agentPolicyResponse.body.item.id;
}

export async function createPackagePolicy(bettertest: BetterTest, agentPolicyId: string) {
  // Get version of available APM package
  const apmPackageResponse = await bettertest<{ item: any }>({
    pathname: `/api/fleet/epm/packages/apm`,
  });
  const apmPackageVersion = apmPackageResponse.body.item.version;

  // Create package policy for APM attached to given agent policy id
  const packagePolicyResponse = await bettertest<{ item: NewPackagePolicy }>({
    pathname: '/api/fleet/package_policies',
    method: 'post',
    body: {
      name: 'apm-integration-test-policy',
      description: '',
      namespace: 'default',
      policy_id: agentPolicyId,
      enabled: true,
      inputs: [{ type: 'apm', policy_template: 'apmserver', enabled: true, streams: [], vars: {} }],
      package: { name: 'apm', title: 'Elastic APM', version: apmPackageVersion },
    },
  });
  return packagePolicyResponse.body.item.id as string;
}

export async function deleteAgentPolicy(bettertest: BetterTest, agentPolicyId: string) {
  return await bettertest({
    pathname: '/api/fleet/agent_policies/delete',
    method: 'post',
    body: { agentPolicyId },
  });
}

export async function deletePackagePolicy(bettertest: BetterTest, packagePolicyId: string) {
  return bettertest({
    pathname: `/api/fleet/package_policies/delete`,
    method: 'post',
    body: { packagePolicyIds: [packagePolicyId] },
  });
}

export async function getPackagePolicy(
  bettertest: BetterTest,
  packagePolicyId: string
): Promise<PackagePolicy> {
  const res = await bettertest<{ item: PackagePolicy }>({
    pathname: `/api/fleet/package_policies/${packagePolicyId}`,
  });
  return res.body.item;
}

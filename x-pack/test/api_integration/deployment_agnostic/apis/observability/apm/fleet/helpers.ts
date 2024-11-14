/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PackagePolicy, NewPackagePolicy, AgentPolicy } from '@kbn/fleet-plugin/common';
import { SupertestWithoutAuthProviderType } from '../../../../services';

export function setupFleet(
  supertest: SupertestWithoutAuthProviderType,
  adminRoleAuthc,
  internalHeaders
) {
  return supertest.post('/api/fleet/setup').set(adminRoleAuthc.apiKeyHeader).set(internalHeaders);
}

export async function createAgentPolicy({
  supertest,
  adminRoleAuthc,
  internalHeaders,
  id,
  name = 'test_agent_policy',
}: {
  supertest: SupertestWithoutAuthProviderType;
  id?: string;
  name?: string;
}) {
  const agentPolicyResponse: { body: { item: AgentPolicy } } = await supertest
    .post('/api/fleet/agent_policies')
    .query({
      sys_monitoring: true,
    })
    .set(adminRoleAuthc.apiKeyHeader)
    .set(internalHeaders)
    .send({
      id,
      name,
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    });
  console.log(agentPolicyResponse.body);
  return agentPolicyResponse.body.item.id;
}

export async function createPackagePolicy({
  supertest,
  adminRoleAuthc,
  internalHeaders,
  agentPolicyId,
  id,
  name = 'apm-integration-test-policy',
}: {
  supertest: SupertestWithoutAuthProviderType;
  agentPolicyId: string;
  id?: string;
  name?: string;
}) {
  // Get version of available APM package
  const apmPackageResponse = await supertest
    .get(`/api/fleet/epm/packages/apm`)
    .set(adminRoleAuthc.apiKeyHeader)
    .set(internalHeaders);
  const apmPackageVersion = apmPackageResponse.body.item.version;

  // Create package policy for APM attached to given agent policy id
  const packagePolicyResponse = await supertest
    .post('/api/fleet/package_policies')
    .send({
      name,
      description: '',
      namespace: 'default',
      policy_id: agentPolicyId,
      id,
      enabled: true,
      inputs: [{ type: 'apm', policy_template: 'apmserver', enabled: true, streams: [], vars: {} }],
      package: { name: 'apm', title: 'Elastic APM', version: apmPackageVersion },
    })
    .set(adminRoleAuthc.apiKeyHeader)
    .set(internalHeaders);
  console.log(packagePolicyResponse.body);
  return packagePolicyResponse.body.item.id as string;
}

export async function deleteAgentPolicy(
  supertest: SupertestWithoutAuthProviderType,
  adminRoleAuthc,
  internalHeaders,
  agentPolicyId: string
) {
  return await supertest
    .post('/api/fleet/agent_policies/delete')
    .send({
      agentPolicyId,
    })
    .set(adminRoleAuthc.apiKeyHeader)
    .set(internalHeaders);
}

export async function deletePackagePolicy(
  supertest: SupertestWithoutAuthProviderType,
  adminRoleAuthc,
  internalHeaders,
  packagePolicyId: string
) {
  return supertest
    .post(`/api/fleet/package_policies/delete`)
    .send({ packagePolicyIds: [packagePolicyId] })
    .set(adminRoleAuthc.apiKeyHeader)
    .set(internalHeaders);
}

export async function getPackagePolicy(
  supertest: SupertestWithoutAuthProviderType,
  adminRoleAuthc,
  internalHeaders,
  packagePolicyId: string
): Promise<PackagePolicy> {
  const res = await supertest
    .get(`/api/fleet/package_policies/${packagePolicyId}`)
    .set(adminRoleAuthc.apiKeyHeader)
    .set(internalHeaders);

  return res.body.item;
}

async function getAgentPolicyByName(
  supertest: SupertestWithoutAuthProviderType,
  adminRoleAuthc,
  internalHeaders,
  name: string
): Promise<PackagePolicy> {
  const res = await supertest
    .get(`/api/fleet/agent_policies`)
    .send({
      query: {
        full: true,
        kuery: `name:"${name}"`,
      },
    })
    .set(adminRoleAuthc.apiKeyHeader)
    .set(internalHeaders);

  return res.body.items[0];
}

export async function deleteAgentPolicyAndPackagePolicyByName({
  supertest,
  adminRoleAuthc,
  internalHeaders,
  agentPolicyName,
  packagePolicyName,
}: {
  supertest: SupertestWithoutAuthProviderType;
  agentPolicyName: string;
  packagePolicyName: string;
}) {
  const agentPolicy = await getAgentPolicyByName(
    supertest,
    adminRoleAuthc,
    internalHeaders,
    agentPolicyName
  );
  const agentPolicyId = agentPolicy.id;
  // @ts-expect-error
  const packagePolicies = agentPolicy.package_policies as PackagePolicy[];

  await deleteAgentPolicy(supertest, adminRoleAuthc, internalHeaders, agentPolicyId);

  if (packagePolicies && packagePolicies.length > 0) {
    const packagePolicyId = packagePolicies.find(
      (packagePolicy) => packagePolicy.name === packagePolicyName
    )!.id;

    await deletePackagePolicy(supertest, adminRoleAuthc, internalHeaders, packagePolicyId);
  }
}

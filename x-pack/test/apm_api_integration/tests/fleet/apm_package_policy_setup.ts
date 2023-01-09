/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../common/ftr_provider_context';

export async function setupFleet(ftrProviderContext: FtrProviderContext) {
  const { getService } = ftrProviderContext;
  const supertest = getService('supertest');
  // Initialize fleet setup
  await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'xxx').send().expect(200);
}

export async function createAgentPolicy(ftrProviderContext: FtrProviderContext) {
  const { getService } = ftrProviderContext;
  const supertest = getService('supertest');
  // Ceate agent policy and get id
  const agentPolicyResponse = await supertest
    .post('/api/fleet/agent_policies?sys_monitoring=true')
    .set('kbn-xsrf', 'true')
    .send({
      name: 'test_agent_policy',
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics'],
    })
    .expect(200);
  return agentPolicyResponse.body.item.id;
}

export async function createPackagePolicy(
  ftrProviderContext: FtrProviderContext,
  agentPolicyId: string
) {
  const { getService } = ftrProviderContext;
  const supertest = getService('supertest');

  // Get version of available APM package
  const apmPackageResponse = await supertest
    .get(`/api/fleet/epm/packages/apm`)
    .set('kbn-xsrf', 'true')
    .expect(200);
  const apmPackageVersion = apmPackageResponse.body.item.version;

  // Create package policy for APM attached to given agent policy id
  const packagePolicyResponse = await supertest
    .post('/api/fleet/package_policies')
    .set('kbn-xsrf', 'true')
    .send({
      name: 'apm-integration-test-policy',
      description: '',
      namespace: 'default',
      policy_id: agentPolicyId,
      enabled: true,
      inputs: [{ type: 'apm', policy_template: 'apmserver', enabled: true, streams: [], vars: {} }],
      package: { name: 'apm', title: 'Elastic APM', version: apmPackageVersion },
    })
    .expect(200);
  return packagePolicyResponse.body.item;
}

export async function deleteAgentPolicy(
  ftrProviderContext: FtrProviderContext,
  agentPolicyId: string
) {
  const { getService } = ftrProviderContext;
  const supertest = getService('supertest');
  await supertest
    .post('/api/fleet/agent_policies/delete')
    .set('kbn-xsrf', 'true')
    .send({ agentPolicyId })
    .expect(200);
}

export async function deletePackagePolicy(
  ftrProviderContext: FtrProviderContext,
  packagePolicyId: string
) {
  const { getService } = ftrProviderContext;
  const supertest = getService('supertest');
  await supertest
    .post(`/api/fleet/package_policies/delete`)
    .set('kbn-xsrf', 'true')
    .send({ packagePolicyIds: [packagePolicyId] })
    .expect(200);
}

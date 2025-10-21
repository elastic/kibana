/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';

import {
  COLLECTOR_PACKAGE_POLICY_NAME,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from '@kbn/profiling-data-access-plugin/common';

import type TestAgent from 'supertest/lib/agent';

export async function deletePackagePolicy(st: TestAgent, packagePolicyId: string | undefined) {
  if (!packagePolicyId) {
    return;
  }
  await st.post(`/api/fleet/package_policies/delete`).send({ packagePolicyIds: [packagePolicyId] });
}

export async function getProfilingPackagePolicyIds(st: TestAgent) {
  const response = await st.get('/api/fleet/package_policies');
  const policies: PackagePolicy[] = response.body.items;
  const collector = policies.find((item) => item.name === COLLECTOR_PACKAGE_POLICY_NAME);
  const symbolizer = policies.find((item) => item.name === SYMBOLIZER_PACKAGE_POLICY_NAME);

  return {
    collectorId: collector?.id,
    symbolizerId: symbolizer?.id,
  };
}

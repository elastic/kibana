/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  COLLECTOR_PACKAGE_POLICY_NAME,
  SYMBOLIZER_PACKAGE_POLICY_NAME,
} from '@kbn/profiling-data-access-plugin/common';
import { BetterTest } from '../common/bettertest';

export async function deletePackagePolicy(bettertest: BetterTest, packagePolicyId: string) {
  return bettertest({
    pathname: `/api/fleet/package_policies/delete`,
    method: 'post',
    body: { packagePolicyIds: [packagePolicyId] },
  });
}

export async function getProfilingPackagePolicyIds(bettertest: BetterTest) {
  const response = await bettertest<{ items: PackagePolicy[] }>({
    pathname: '/api/fleet/package_policies',
    method: 'get',
  });

  const collector = response.body.items.find((item) => item.name === COLLECTOR_PACKAGE_POLICY_NAME);
  const symbolizer = response.body.items.find(
    (item) => item.name === SYMBOLIZER_PACKAGE_POLICY_NAME
  );

  return {
    collectorId: collector?.id,
    symbolizerId: symbolizer?.id,
  };
}

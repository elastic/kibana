/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';

/** Fleet package-policies query scoped to the synthetics package. */
const fleetPackagePoliciesPath = (spaceId?: string) =>
  `${
    spaceId ? `s/${spaceId}/` : ''
  }api/fleet/package_policies?page=1&perPage=2000&kuery=${encodeURIComponent(
    'ingest-package-policies.package.name: synthetics'
  )}`;

/**
 * `GET /api/fleet/package_policies?...synthetics` — returns the synthetics
 * Fleet package policies. Mirrors `PrivateLocationTestService.getPackagePolicies`
 * from the FTR suites; the caller supplies elevated auth headers.
 */
export async function getSyntheticsPackagePolicies(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  opts: { spaceId?: string } = {}
): Promise<PackagePolicy[]> {
  const res = await apiClient.get(fleetPackagePoliciesPath(opts.spaceId), {
    headers,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(200);
  return (res.body as { items: PackagePolicy[] }).items;
}

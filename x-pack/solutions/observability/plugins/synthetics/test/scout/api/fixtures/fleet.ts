/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { tryForTime } from './retry';

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

/**
 * Returns the compiled `synthetics/browser` journey stream of a monitor's Fleet
 * package policy (the stream Fleet injects synced global `params` into). Used by
 * the global-params sync suites to assert params are added/removed without
 * depending on the brittle full golden-policy comparison.
 */
export function getBrowserCompiledStream(
  policy: PackagePolicy | undefined
): Record<string, unknown> | undefined {
  const browserInput = policy?.inputs.find((input) => input.type === 'synthetics/browser');
  const journeyStream = browserInput?.streams.find(
    (stream) => (stream.compiled_stream as { type?: string } | undefined)?.type === 'browser'
  );
  return journeyStream?.compiled_stream as Record<string, unknown> | undefined;
}

/**
 * `GET /api/fleet/package_policies?...synthetics` then `.find` by the
 * `${monitorId}-${locationId}` package-policy id. Mirrors the FTR
 * `getPackagePoliciesForMonitor` helper used by the reset suites.
 */
export async function getPackagePolicyForMonitor(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  monitorId: string,
  locationId: string,
  opts: { spaceId?: string } = {}
): Promise<PackagePolicy | undefined> {
  const policies = await getSyntheticsPackagePolicies(apiClient, headers, opts);
  return policies.find((policy) => policy.id === `${monitorId}-${locationId}`);
}

/**
 * Force-deletes a single Fleet package policy by id. Mirrors the FTR
 * `deletePackagePolicyDirectly` helper used to simulate a corrupted/missing
 * package policy before a reset.
 */
export async function deletePackagePolicyById(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  policyId: string,
  opts: { spaceId?: string } = {}
) {
  const res = await apiClient.post(
    `${opts.spaceId ? `s/${opts.spaceId}/` : ''}api/fleet/package_policies/delete`,
    {
      headers,
      body: { packagePolicyIds: [policyId], force: true },
      responseType: 'json',
    }
  );
  expect(res).toHaveStatusCode(200);
  return res;
}

/**
 * Creates a legacy-format synthetics package policy (id =
 * `${monitorId}-${locationId}-${spaceId}`) directly via the Fleet API and marks
 * it `is_managed`, mirroring the FTR `createLegacyPackagePolicy` helper used to
 * seed pre-migration state. Both calls are retried to absorb transient Fleet
 * failures.
 */
export async function createLegacyPackagePolicy(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  params: {
    monitorId: string;
    locationId: string;
    spaceId: string;
    fleetPolicyId: string;
    packageVersion: string;
  }
): Promise<string> {
  const { monitorId, locationId, spaceId, fleetPolicyId, packageVersion } = params;
  const legacyPolicyId = `${monitorId}-${locationId}-${spaceId}`;

  await tryForTime(60_000, async () => {
    const res = await apiClient.post('api/fleet/package_policies', {
      headers,
      body: {
        id: legacyPolicyId,
        name: `legacy-${legacyPolicyId}`,
        namespace: 'default',
        policy_ids: [fleetPolicyId],
        package: { name: 'synthetics', version: packageVersion },
        inputs: [{ type: 'synthetics/http', enabled: true, streams: [] }],
      },
      responseType: 'json',
    });
    expect(res).toHaveStatusCode(200);
  });

  await tryForTime(60_000, async () => {
    const res = await apiClient.put(`api/fleet/package_policies/${legacyPolicyId}`, {
      headers,
      body: { is_managed: true, force: true },
      responseType: 'json',
    });
    expect(res).toHaveStatusCode(200);
  });

  return legacyPolicyId;
}

/**
 * Force-deletes every synthetics Fleet package policy via the Fleet bulk-delete
 * API. Used by package-policy-count-sensitive suites to guarantee a clean Fleet
 * baseline, since `savedObjects.clean` does not reliably remove the hidden
 * `ingest-package-policies` saved objects (and leaves orphans behind).
 */
export async function deleteAllSyntheticsPackagePolicies(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  opts: { spaceId?: string } = {}
) {
  const policies = await getSyntheticsPackagePolicies(apiClient, headers, opts);
  if (policies.length === 0) {
    return;
  }
  const res = await apiClient.post(
    `${opts.spaceId ? `s/${opts.spaceId}/` : ''}api/fleet/package_policies/delete`,
    {
      headers,
      body: { packagePolicyIds: policies.map((p) => p.id), force: true },
      responseType: 'json',
    }
  );
  expect(res).toHaveStatusCode(200);
}

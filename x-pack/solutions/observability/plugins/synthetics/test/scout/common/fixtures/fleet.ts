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
 * Force-updates a managed synthetics package policy's agent `condition`.
 * Used to seed a leftover `${agent.id}` pin before asserting that disabling
 * location sharding clears it — CI locations have no enrolled agents, so
 * create never stamps a pin on its own.
 */
export async function setPackagePolicyCondition(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  policyId: string,
  condition: string | null
): Promise<PackagePolicy> {
  const getRes = await apiClient.get(`api/fleet/package_policies/${policyId}`, {
    headers,
    responseType: 'json',
  });
  expect(getRes).toHaveStatusCode(200);
  const item = (getRes.body as { item: PackagePolicy }).item;

  const putRes = await apiClient.put(`api/fleet/package_policies/${policyId}`, {
    headers,
    body: {
      name: item.name,
      description: item.description,
      namespace: item.namespace,
      enabled: item.enabled,
      is_managed: item.is_managed,
      package: item.package,
      inputs: item.inputs.map(({ compiled_input: _compiledInput, ...input }) => ({
        ...input,
        streams: input.streams.map(({ compiled_stream: _compiledStream, ...stream }) => stream),
      })),
      vars: item.vars,
      policy_id: item.policy_id,
      policy_ids: item.policy_ids,
      force: true,
      condition,
    },
    responseType: 'json',
  });
  expect(putRes).toHaveStatusCode(200);
  return (putRes.body as { item: PackagePolicy }).item;
}

/**
 * `GET /api/fleet/agent_policies/{id}` -- returns the agent policy's current
 * revision. A monitor write against a scalable (condition-sharded) private
 * location opts out of Fleet's own immediate bump and instead schedules a
 * batched bump on the shared agent policy; the revision strictly increasing
 * is the directly-observable side effect of that batched bump actually
 * running, as opposed to a write that returns 200 without one.
 */
export async function getAgentPolicyRevision(
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  agentPolicyId: string
): Promise<number> {
  const res = await apiClient.get(`api/fleet/agent_policies/${agentPolicyId}`, {
    headers,
    responseType: 'json',
  });
  expect(res).toHaveStatusCode(200);
  return (res.body as { item: { revision: number } }).item.revision;
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

function fleetHttpError(action: string, res: { statusCode: number; body: unknown }): Error {
  return new Error(`${action}: ${res.statusCode} ${JSON.stringify(res.body)}`);
}

/**
 * Seed a legacy-format managed synthetics package policy via Fleet.
 *
 * Waits for the agent policy to be GET-able first (create 404s while a
 * concurrent deploy is in flight). Create and "exists + managed" share one
 * retry loop: a 409 does not mean the policy is GET-able — cleanup can delete
 * a just-created extra, and Fleet package-policy 404s are mislabelled
 * `Saved object [fleet-agent-policies/<id>] not found`.
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
    const agentPolicyRes = await apiClient.get(`api/fleet/agent_policies/${fleetPolicyId}`, {
      headers,
      responseType: 'json',
    });
    if (agentPolicyRes.statusCode !== 200) {
      throw fleetHttpError(`Agent policy ${fleetPolicyId} not ready`, agentPolicyRes);
    }

    const createRes = await apiClient.post('api/fleet/package_policies', {
      headers,
      body: {
        id: legacyPolicyId,
        name: `legacy-${legacyPolicyId}`,
        namespace: 'default',
        policy_id: fleetPolicyId,
        policy_ids: [fleetPolicyId],
        force: true,
        is_managed: true,
        package: { name: 'synthetics', version: packageVersion },
        inputs: [{ type: 'synthetics/http', enabled: true, streams: [] }],
      },
      responseType: 'json',
    });
    if (createRes.statusCode !== 200 && createRes.statusCode !== 409) {
      throw fleetHttpError(`Failed to create legacy package policy ${legacyPolicyId}`, createRes);
    }

    const getRes = await apiClient.get(`api/fleet/package_policies/${legacyPolicyId}`, {
      headers,
      responseType: 'json',
    });
    if (getRes.statusCode !== 200) {
      throw fleetHttpError(
        `Legacy package policy ${legacyPolicyId} not found after create`,
        getRes
      );
    }

    const item = (getRes.body as { item: { is_managed?: boolean } }).item;
    if (item.is_managed) {
      return;
    }

    const putRes = await apiClient.put(`api/fleet/package_policies/${legacyPolicyId}`, {
      headers,
      body: {
        is_managed: true,
        force: true,
        policy_id: fleetPolicyId,
        policy_ids: [fleetPolicyId],
      },
      responseType: 'json',
    });
    if (putRes.statusCode !== 200) {
      throw fleetHttpError(`Failed to mark package policy ${legacyPolicyId} as managed`, putRes);
    }
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

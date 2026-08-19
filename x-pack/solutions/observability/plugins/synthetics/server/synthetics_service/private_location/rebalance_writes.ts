/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, UpdatePackagePolicyWithId } from '@kbn/fleet-plugin/common';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { agentIdCondition, agentIdFromCondition } from './assign_by_condition';
import { getMonitorCostMib, type MonitorPlacement } from './assign_shards';

/**
 * Config id embedded in a package-policy id, or undefined when the id doesn't
 * belong to this location. New format is `${configId}-${locationId}`; legacy
 * space-suffixed format is `${configId}-${locationId}-${spaceId}`, so the
 * location id is an infix — `indexOf` (not a fixed trailing strip) handles both.
 */
export const configIdOf = (policyId: string, locationId: string): string | undefined => {
  const idx = policyId.indexOf(`-${locationId}`);
  return idx > 0 ? policyId.slice(0, idx) : undefined;
};

/**
 * Monitor type of a synthetics package policy, read from its single enabled
 * input (`synthetics/${type}`). Only `browser` vs. lightweight matters for the
 * memory cost model, so anything non-browser is treated as lightweight.
 */
export const monitorTypeOfPolicy = (pp: PackagePolicy): string =>
  pp.inputs?.some((input) => input.enabled && input.type === 'synthetics/browser')
    ? 'browser'
    : 'http';

/**
 * Current placement of a location's monitors, ready for {@link rebalanceByCost}:
 * monitor (config) id, memory cost, and the agent it is currently pinned to
 * (parsed from the package-policy condition; undefined ⇒ unassigned/stale).
 *
 * A monitor can have both a new-format and a legacy space-suffixed package
 * policy; dedupe by config id so its cost isn't counted twice and the balancer
 * isn't skewed.
 */
export const toMonitorPlacements = (
  pkgPolicies: PackagePolicy[],
  locationId: string
): MonitorPlacement[] => {
  const byId = new Map<string, MonitorPlacement>();
  for (const pkgPolicy of pkgPolicies) {
    const configId = configIdOf(pkgPolicy.id, locationId);
    if (!configId || byId.has(configId)) {
      continue;
    }
    byId.set(configId, {
      id: configId,
      cost: getMonitorCostMib(monitorTypeOfPolicy(pkgPolicy)),
      currentAgentId: agentIdFromCondition(pkgPolicy.condition),
    });
  }
  return [...byId.values()];
};

/**
 * Minimal update payload that only re-targets a package policy to a different
 * agent by rewriting its `${agent.id}` condition. Carries the existing content
 * (inputs/vars/package) and single-policy binding over unchanged and drops
 * saved-object metadata Fleet recomputes on update, so the compiled config stays
 * identical and only the runtime agent condition changes.
 *
 * Carries `version` (the optimistic-concurrency token from the snapshot read) so
 * Fleet rejects the write with a conflict if the package policy changed since —
 * a concurrent monitor edit, or the `Sync-Private-Location-Monitors` task writing
 * the same policy on its own schedule. Without it, this full-object rewrite built
 * from a stale snapshot would silently revert that change. On conflict the mover
 * lands in `bulkUpdate`'s failed set and is retried from a fresh read next cycle
 * (the rebalance is idempotent).
 */
export const toConditionUpdate = (
  pkgPolicy: PackagePolicy,
  condition: string
): UpdatePackagePolicyWithId => ({
  id: pkgPolicy.id,
  version: pkgPolicy.version,
  name: pkgPolicy.name,
  description: pkgPolicy.description,
  namespace: pkgPolicy.namespace,
  enabled: pkgPolicy.enabled,
  is_managed: pkgPolicy.is_managed,
  package: pkgPolicy.package,
  inputs: pkgPolicy.inputs,
  vars: pkgPolicy.vars,
  output_id: pkgPolicy.output_id,
  supports_agentless: pkgPolicy.supports_agentless,
  global_data_tags: pkgPolicy.global_data_tags,
  elasticsearch: pkgPolicy.elasticsearch,
  overrides: pkgPolicy.overrides,
  additional_datastreams_permissions: pkgPolicy.additional_datastreams_permissions,
  policy_id: pkgPolicy.policy_id,
  policy_ids: pkgPolicy.policy_ids,
  condition,
});

/**
 * The diff: for each package policy whose assigned agent differs from the one
 * already stamped in its condition, a condition-only update — grouped by the
 * policy's own space so each group can be applied with the right client.
 * Package policies already pinned to the right agent (and unplaceable ones)
 * produce no update, so a steady state yields an empty map ⇒ zero writes.
 *
 * Note both the new-format and legacy package policies of one monitor are
 * updated (they map to the same config id); only the cost accounting in
 * {@link toMonitorPlacements} dedupes them.
 */
export const toConditionUpdates = (
  pkgPolicies: PackagePolicy[],
  assignment: ReadonlyMap<string, string>,
  locationId: string
): Map<string, UpdatePackagePolicyWithId[]> => {
  const bySpace = new Map<string, UpdatePackagePolicyWithId[]>();
  for (const pkgPolicy of pkgPolicies) {
    const configId = configIdOf(pkgPolicy.id, locationId);
    if (!configId) {
      continue;
    }
    const desiredAgentId = assignment.get(configId);
    if (!desiredAgentId) {
      continue; // unplaceable (no healthy target) → leave as-is, no write
    }
    const desiredCondition = agentIdCondition(desiredAgentId);
    if (pkgPolicy.condition === desiredCondition) {
      continue; // already pinned to the right agent → no write
    }
    const spaceId = pkgPolicy.spaceIds?.[0] ?? DEFAULT_SPACE_ID;
    const updates = bySpace.get(spaceId) ?? [];
    updates.push(toConditionUpdate(pkgPolicy, desiredCondition));
    bySpace.set(spaceId, updates);
  }
  return bySpace;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy, PackagePolicyInput } from '@kbn/fleet-plugin/common';
import type { PackagePolicyPartialUpdate } from '@kbn/fleet-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { agentIdCondition, agentIdFromCondition, configIdOf } from './assign_by_condition';
import { getMonitorCostMib, type MonitorPlacement } from './assign_shards';

export { configIdOf };

/**
 * The projection of a package policy that the shard-rebalance path actually
 * reads.
 *
 * Rebalancing only ever re-pins `condition`, so the snapshot no longer has to
 * carry the whole policy the way it did when the write went through Fleet's
 * full `bulkUpdate` and had to re-send every attribute. Everything outside this
 * shape is dead weight in a task that holds every monitor of a location in
 * memory at once — above all `inputs[].streams[].compiled_stream`, which
 * carries a browser monitor's inline script.
 *
 * Deliberately narrower than `PackagePolicy`: Fleet's `list` types its result as
 * complete however it is projected, so a field that is read but not fetched
 * would be `undefined` at runtime with nothing to catch it. Keep in step with
 * {@link SHARDED_PACKAGE_POLICY_FIELDS}.
 */
export type ShardedPackagePolicy = Pick<
  PackagePolicy,
  'id' | 'version' | 'spaceIds' | 'name' | 'condition' | 'revision' | 'policy_ids'
> & {
  inputs: Array<Pick<PackagePolicyInput, 'type' | 'enabled'>>;
};

/**
 * Source filter producing {@link ShardedPackagePolicy}. `id`, `version` and
 * `spaceIds` are omitted because they come off the saved-object envelope and are
 * returned whatever the projection.
 *
 * `name` is not part of the rebalance decision; it is fetched so both Fleet's
 * `list` and the write below can keep naming package policies in the
 * saved-object audit log.
 */
export const SHARDED_PACKAGE_POLICY_FIELDS = [
  'name',
  'condition',
  'revision',
  'policy_ids',
  'inputs.type',
  'inputs.enabled',
];

/**
 * Monitor type of a synthetics package policy, read from its single enabled
 * input (`synthetics/${type}`). Only `browser` vs. lightweight matters for the
 * memory cost model, so anything non-browser is treated as lightweight.
 */
export const monitorTypeOfPolicy = (pp: ShardedPackagePolicy): string =>
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
  pkgPolicies: ShardedPackagePolicy[],
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
 * A condition-only package-policy write, paired with the agent policies that
 * must be revision-bumped once it lands.
 *
 * The bump targets cannot be read back off the write: `bulkUpdatePartial`
 * echoes only the attributes that were sent, so `policy_ids` is absent from its
 * result. They are captured here from the source policy instead.
 */
export interface ConditionUpdate {
  update: PackagePolicyPartialUpdate;
  agentPolicyIds: string[];
}

/**
 * A package policy read back from Fleet always carries its saved-object
 * `version`, but the type models it as optional. Narrowing here keeps the
 * optimistic-concurrency token mandatory on the write path rather than
 * degrading to a blind overwrite when it is somehow absent.
 */
const hasVersion = (
  pkgPolicy: ShardedPackagePolicy
): pkgPolicy is ShardedPackagePolicy & { version: string } => typeof pkgPolicy.version === 'string';

/**
 * Minimal write that only re-targets a package policy to a different agent by
 * rewriting its `${agent.id}` condition. Sends just the changed attribute plus
 * the revision metadata Fleet's full `bulkUpdate` would have stamped, so the
 * rest of the stored document (inputs/vars/package/bindings) is left untouched
 * by the saved-objects merge rather than rewritten from a snapshot.
 *
 * `revision` is bumped because it is compiled into the agent's policy document
 * (`package_policies_to_agent_inputs`), so holding it back would change what
 * agents receive.
 *
 * Carries `version` (the optimistic-concurrency token from the snapshot read)
 * so Fleet rejects the write with a conflict if the package policy changed
 * since — a concurrent monitor edit, or the `Sync-Private-Location-Monitors`
 * task writing the same policy on its own schedule. On conflict the mover lands
 * in the failed set and is retried from a fresh read next cycle (the rebalance
 * is idempotent).
 *
 * `name` is re-sent unchanged, the one attribute here that is not part of the
 * move. Saved-object `bulkUpdate` echoes back only the attributes it was given,
 * not the merged document, so Fleet's `bulkUpdatePartial` reads
 * `result.attributes.name` as `undefined` and writes a nameless entry to the
 * saved-object audit log. Sending it keeps those entries identifiable, and
 * cannot clobber a concurrent rename: `version` would no longer match and the
 * write would be rejected as a conflict.
 */
export const toConditionUpdate = (
  pkgPolicy: ShardedPackagePolicy & { version: string },
  condition: string | null
): ConditionUpdate => ({
  update: {
    id: pkgPolicy.id,
    version: pkgPolicy.version,
    attributes: {
      condition,
      name: pkgPolicy.name,
      revision: pkgPolicy.revision + 1,
      updated_at: new Date().toISOString(),
      updated_by: 'system',
    },
  },
  agentPolicyIds: pkgPolicy.policy_ids ?? [],
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
  pkgPolicies: ShardedPackagePolicy[],
  assignment: ReadonlyMap<string, string>,
  locationId: string
): Map<string, ConditionUpdate[]> => {
  const bySpace = new Map<string, ConditionUpdate[]>();
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
    if (!hasVersion(pkgPolicy)) {
      continue; // no concurrency token → skip rather than blind-overwrite
    }
    const spaceId = pkgPolicy.spaceIds?.[0] ?? DEFAULT_SPACE_ID;
    const updates = bySpace.get(spaceId) ?? [];
    updates.push(toConditionUpdate(pkgPolicy, desiredCondition));
    bySpace.set(spaceId, updates);
  }
  return bySpace;
};

/**
 * Condition-only updates that drop every existing agent pin. Used when shard
 * rebalancing is turned off so monitors go back to unfiltered (classic) scheduling.
 */
export const toClearedConditionUpdates = (
  pkgPolicies: ShardedPackagePolicy[]
): Map<string, ConditionUpdate[]> => {
  const bySpace = new Map<string, ConditionUpdate[]>();
  for (const pkgPolicy of pkgPolicies) {
    if (typeof pkgPolicy.condition !== 'string') {
      continue;
    }
    if (!hasVersion(pkgPolicy)) {
      continue; // no concurrency token → skip rather than blind-overwrite
    }
    const spaceId = pkgPolicy.spaceIds?.[0] ?? DEFAULT_SPACE_ID;
    const updates = bySpace.get(spaceId) ?? [];
    updates.push(toConditionUpdate(pkgPolicy, null));
    bySpace.set(spaceId, updates);
  }
  return bySpace;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVENTORY_PACK_BODY,
  INVENTORY_PACK_NAME,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/pack_body';
import type {
  OnboardingPlan,
  RuntimePinResult,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import type {
  NativeVulnScannerClient,
  PackUpdateBody,
} from '../../../common/api/use_native_vuln_scanner_api';
import { getHttpErrorInfo } from './http_error';

const NO_AGENTS_FOUND_CODE = 'NO_AGENTS_FOUND';

/**
 * Pinning the runtime restarts osquerybeat on every agent of the policy. A live query sent while it
 * restarts is acknowledged by Fleet but never answered, because osqueryd reconnects later. The
 * reconnect took 1-2 seconds when traced, so 10 seconds also covers slow hosts without making the
 * apply feel stuck.
 */
export const PIN_RESTART_SETTLE_MS = 10000;

export type PackStepStatus = 'created' | 'updated' | 'unchanged' | 'failed' | 'not_run';

export interface PackStepResult {
  status: PackStepStatus;
  packId?: string;
  message?: string;
}

export type LiveQueryStatus = 'started' | 'no_agents' | 'skipped' | 'failed' | 'not_run';

export interface LiveQueryResult {
  status: LiveQueryStatus;
  message?: string;
}

export interface ApplyOnboardingResult {
  policies: RuntimePinResult[];
  pack: PackStepResult;
  liveQuery: LiveQueryResult;
}

const union = (...lists: string[][]): string[] => Array.from(new Set(lists.flat()));

const applyPack = async (
  client: NativeVulnScannerClient,
  plan: OnboardingPlan,
  policyIds: string[]
): Promise<PackStepResult> => {
  try {
    const { data: found } = await client.findPacks(INVENTORY_PACK_NAME);
    // The osquery search is fuzzy, so only the exact pack name counts.
    const existing = found.find(({ name }) => name === INVENTORY_PACK_NAME);

    if (!existing) {
      const { data } = await client.createPack(INVENTORY_PACK_BODY, policyIds);
      return { status: 'created', packId: data.saved_object_id ?? data.id };
    }

    const current = existing.policy_ids ?? [];
    const merged = union(current, policyIds);
    const repair =
      plan.pack.action === 'repair_queries' ||
      plan.pack.action === 'repair_queries_and_add_policies';

    if (!repair && merged.length === current.length) {
      return { status: 'unchanged', packId: existing.saved_object_id };
    }

    // The osquery PUT writes `description || ''`, so it is always sent. The schedule is always sent
    // too: a stored pack-level interval without schedule_type makes osquery answer 400 on any PUT.
    // The other omitted fields (enabled, queries, shards) are left as stored. The find-merge-PUT is
    // not version-checked, so a concurrent edit to the pack in between is overwritten: acceptable
    // for v1, where onboarding is a rare admin action and a re-read would not close the window.
    const description = existing.description ?? INVENTORY_PACK_BODY.description;
    const schedule = {
      schedule_type: INVENTORY_PACK_BODY.schedule_type,
      interval: INVENTORY_PACK_BODY.interval,
    };
    const body: PackUpdateBody = repair
      ? {
          policy_ids: merged,
          description,
          enabled: INVENTORY_PACK_BODY.enabled,
          ...schedule,
          queries: INVENTORY_PACK_BODY.queries,
        }
      : { policy_ids: merged, description, ...schedule };
    await client.updatePack(existing.saved_object_id, body);
    return { status: 'updated', packId: existing.saved_object_id };
  } catch (e) {
    return { status: 'failed', message: getHttpErrorInfo(e).message };
  }
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Runs the inventory pack as a live query. A refused live query is not a failure: the daily
 * schedule still delivers the inventory.
 */
export const requestInventory = async (
  client: NativeVulnScannerClient,
  packId: string,
  policyIds: string[]
): Promise<LiveQueryResult> => {
  try {
    await client.runPackLiveQuery(packId, policyIds);
    return { status: 'started' };
  } catch (e) {
    const { status, code, message } = getHttpErrorInfo(e);
    if (status === 400 && code === NO_AGENTS_FOUND_CODE) return { status: 'no_agents' };
    if (status === 400 || status === 403) return { status: 'skipped', message };
    return { status: 'failed', message };
  }
};

/**
 * Applies the onboarding in order: runtime pin, then the osquery pack (create, or update with the
 * selected policies merged into the existing ones), then a live query for the first inventory.
 * When a pin restarted osquerybeat, the live query waits `settleMs` for the agents to reconnect.
 * A failing pin request throws; later steps report their own result instead.
 */
export const applyOnboarding = async (
  client: NativeVulnScannerClient,
  plan: OnboardingPlan,
  selectedPolicyIds: string[],
  settleMs: number = PIN_RESTART_SETTLE_MS
): Promise<ApplyOnboardingResult> => {
  const { results } = await client.pinRuntime(selectedPolicyIds);

  // Only policies that are pinned can run the pack, so refused ones are left out of it.
  const eligibleIds = results
    .filter(({ outcome }) => outcome === 'updated' || outcome === 'no_change')
    .map(({ id }) => id);

  if (eligibleIds.length === 0) {
    return { policies: results, pack: { status: 'not_run' }, liveQuery: { status: 'not_run' } };
  }

  const pack = await applyPack(client, plan, eligibleIds);
  if (pack.status === 'failed' || !pack.packId) {
    return { policies: results, pack, liveQuery: { status: 'not_run' } };
  }

  // Only an `updated` pin restarted osquerybeat; with `no_change` the agents are already up.
  if (results.some(({ outcome }) => outcome === 'updated')) await wait(settleMs);

  const liveQuery = await requestInventory(client, pack.packId, eligibleIds);
  return { policies: results, pack, liveQuery };
};

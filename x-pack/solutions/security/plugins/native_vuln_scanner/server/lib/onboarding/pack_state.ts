/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type {
  PackAction,
  PackDifference,
  PackInspection,
  PackPlan,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import { INVENTORY_PACK_BODY, INVENTORY_PACK_NAME, OSQUERY_PACK_SO_TYPE } from '../inventory';

export type {
  PackAction,
  PackDifference,
  PackDifferenceCode,
  PackInspection,
  PackPlan,
  PackState,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';

/** Type of the references osquery stores on a pack for the agent policies it is assigned to. */
const POLICY_REFERENCE_TYPE = 'ingest-agent-policies';
const PER_PAGE = 100;

interface StoredPackQuery {
  id?: string;
  query?: string;
  platform?: string;
  snapshot?: boolean;
  removed?: boolean;
  result_type?: string;
  enabled?: boolean;
}

interface StoredPack {
  name?: string;
  enabled?: boolean;
  schedule_type?: string | null;
  interval?: number;
  platform?: string;
  result_type?: string;
  queries?: StoredPackQuery[];
}

const parsePlatformTokens = (value: string): Set<string> =>
  new Set(
    value
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
  );

/** Same comparison as osquery's `platformSetsEqual`: the distinct token sets, ignoring order and spacing. */
const samePlatforms = (stored: string | undefined, expected: string): boolean => {
  if (!stored) return false;
  const left = parsePlatformTokens(stored);
  const right = parsePlatformTokens(expected);
  return left.size === right.size && [...left].every((token) => right.has(token));
};

const ALL_PLATFORMS = ['linux', 'windows', 'darwin'];

/** Mirrors osquery's `isEmptyOrAllPlatforms`: no restriction when empty or naming every OS. */
const isEmptyOrAllPlatforms = (value: string | undefined): boolean => {
  if (value === undefined) return true;
  const tokens = parsePlatformTokens(value);
  return (
    tokens.size === 0 ||
    (tokens.size === ALL_PLATFORMS.length && ALL_PLATFORMS.every((os) => tokens.has(os)))
  );
};

/** Mirrors osquery's `resolveEffectiveQueryExecution`: the query's own restriction, else the pack's. */
const effectivePlatform = (query: StoredPackQuery, pack: StoredPack): string | undefined =>
  (isEmptyOrAllPlatforms(query.platform) ? undefined : query.platform) ?? pack.platform;

/**
 * Mirrors osquery's effective result type: the query's `result_type`, else the differential mode
 * its legacy `{ snapshot: false, removed }` pair encodes (`snapshot: true` or absent is not a
 * deliberate choice), else the pack's `result_type`, else snapshot. osquery stores snapshot mode
 * as no key at all, so an absent key is a snapshot unless the pack says otherwise.
 */
const effectiveResultType = (query: StoredPackQuery, pack: StoredPack): string => {
  const legacy =
    query.snapshot === false
      ? query.removed === false
        ? 'differential_added_only'
        : 'differential'
      : undefined;
  return query.result_type ?? legacy ?? pack.result_type ?? 'snapshot';
};

/**
 * Compares only the fields this plugin owns (SQL, platform, snapshot, enabled and the pack-level
 * enabled/schedule_type/interval). Fields osquery adds on its own (`ecs_mapping`, `version`, `timeout`,
 * `schedule_id`, ...) are ignored so an osquery-saved pack does not look drifted.
 */
const compareQueries = (pack: StoredPack): PackDifference[] => {
  const differences: PackDifference[] = [];
  if (pack.enabled === false) differences.push({ code: 'pack_disabled' });
  // osquery rejects a pack-level interval without schedule_type 'interval', so an explicit other
  // type is drift. A missing type (pack saved before osquery stored it) still runs on its intervals
  // and is completed by the next PUT when rrule scheduling is enabled.
  if (pack.schedule_type != null && pack.schedule_type !== INVENTORY_PACK_BODY.schedule_type) {
    differences.push({ code: 'schedule_type_differs' });
  }
  // The pack-level interval is ignored by osquerybeat for a query that sets its own, so only
  // a differing pack interval is reported, not a missing one.
  if (pack.interval !== undefined && pack.interval !== INVENTORY_PACK_BODY.interval) {
    differences.push({ code: 'interval_differs' });
  }
  const stored = new Map((pack.queries ?? []).map((query) => [query.id, query]));
  for (const expected of Object.values(INVENTORY_PACK_BODY.queries)) {
    const queryId = expected.id;
    const actual = stored.get(queryId);
    if (!actual) {
      differences.push({ code: 'query_missing', queryId });
      continue;
    }
    if (actual.query !== expected.query) differences.push({ code: 'query_sql_differs', queryId });
    if (!samePlatforms(effectivePlatform(actual, pack), expected.platform)) {
      differences.push({ code: 'query_platform_differs', queryId });
    }
    if (effectiveResultType(actual, pack) !== 'snapshot') {
      differences.push({ code: 'query_not_snapshot', queryId });
    }
    if (actual.enabled === false) differences.push({ code: 'query_disabled', queryId });
  }
  return differences;
};

/**
 * Looks the inventory pack up in the default space with the caller's saved objects client
 * (`osquery-pack` is not hidden) and compares it against `INVENTORY_PACK_BODY`.
 */
export const inspectInventoryPack = async (
  soClient: SavedObjectsClientContract
): Promise<PackInspection> => {
  for (let page = 1; ; page++) {
    const { saved_objects: packs, total } = await soClient.find<StoredPack>({
      type: OSQUERY_PACK_SO_TYPE,
      namespaces: [DEFAULT_SPACE_ID],
      search: `"${INVENTORY_PACK_NAME}"`,
      searchFields: ['name'],
      perPage: PER_PAGE,
      page,
    });
    // `name` is a text field, so the search is fuzzy; keep the exact name only.
    const pack = packs.find(({ attributes }) => attributes.name === INVENTORY_PACK_NAME);
    if (pack) {
      const differences = compareQueries(pack.attributes);
      return {
        state: differences.length === 0 ? 'ok' : 'differs',
        packId: pack.id,
        differences,
        policyIds: pack.references
          .filter(({ type }) => type === POLICY_REFERENCE_TYPE)
          .map(({ id }) => id),
      };
    }
    if (packs.length === 0 || page * PER_PAGE >= total) {
      return { state: 'missing', differences: [], policyIds: [] };
    }
  }
};

/** What applying the onboarding would do to the pack for the selected policies. */
export const planPackAction = (inspection: PackInspection, policyIds: string[]): PackPlan => {
  const { state, differences } = inspection;
  if (state === 'missing') return { state, action: 'create', differences, addPolicyIds: policyIds };
  const addPolicyIds = policyIds.filter((id) => !inspection.policyIds.includes(id));
  const repair = state === 'differs';
  const action: PackAction = repair
    ? addPolicyIds.length > 0
      ? 'repair_queries_and_add_policies'
      : 'repair_queries'
    : addPolicyIds.length > 0
    ? 'add_policies'
    : 'no_change';
  return { state, action, differences, addPolicyIds };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { INVENTORY_PACK_BODY, INVENTORY_PACK_NAME, OSQUERY_PACK_SO_TYPE } from '../inventory';

/** Type of the references osquery stores on a pack for the agent policies it is assigned to. */
const POLICY_REFERENCE_TYPE = 'ingest-agent-policies';
const PER_PAGE = 100;

export type PackState = 'missing' | 'ok' | 'differs';

export type PackAction =
  | 'create'
  | 'add_policies'
  | 'repair_queries'
  | 'repair_queries_and_add_policies'
  | 'no_change';

interface StoredPackQuery {
  id?: string;
  query?: string;
  platform?: string;
  snapshot?: boolean;
  result_type?: string;
  enabled?: boolean;
}

interface StoredPack {
  name?: string;
  enabled?: boolean;
  interval?: number;
  queries?: StoredPackQuery[];
}

/** Machine-readable reason a pack differs; the browser renders the text. */
export type PackDifferenceCode =
  | 'pack_disabled'
  | 'interval_differs'
  | 'query_missing'
  | 'query_sql_differs'
  | 'query_platform_differs'
  | 'query_not_snapshot'
  | 'query_disabled';

export interface PackDifference {
  code: PackDifferenceCode;
  /** The query concerned; absent for pack-level differences. */
  queryId?: string;
}

export interface PackInspection {
  state: PackState;
  /** Why the pack differs from the expected body; empty unless `state` is `differs`. */
  differences: PackDifference[];
  /** Agent policies the pack is assigned to. */
  policyIds: string[];
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

/**
 * osquery stores a snapshot query as `snapshot: true` or, from its own UI, `result_type: 'snapshot'`.
 */
const isSnapshot = ({ snapshot, result_type: resultType }: StoredPackQuery): boolean =>
  snapshot === true || resultType === 'snapshot';

/**
 * Compares only the fields this plugin owns (SQL, platform, snapshot, enabled and the pack-level
 * enabled/interval). Fields osquery adds on its own (`ecs_mapping`, `version`, `timeout`,
 * `schedule_id`, ...) are ignored so an osquery-saved pack does not look drifted.
 */
const compareQueries = (pack: StoredPack): PackDifference[] => {
  const differences: PackDifference[] = [];
  if (pack.enabled === false) differences.push({ code: 'pack_disabled' });
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
    if (!samePlatforms(actual.platform, expected.platform)) {
      differences.push({ code: 'query_platform_differs', queryId });
    }
    if (!isSnapshot(actual)) differences.push({ code: 'query_not_snapshot', queryId });
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

export interface PackPlan {
  state: PackState;
  action: PackAction;
  differences: PackDifference[];
  /** Selected policies the pack is not yet assigned to. */
  addPolicyIds: string[];
}

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

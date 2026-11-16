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
}

interface StoredPack {
  name?: string;
  enabled?: boolean;
  interval?: number;
  queries?: StoredPackQuery[];
}

export interface PackInspection {
  state: PackState;
  /** Why the pack differs from the expected body; empty unless `state` is `differs`. */
  differences: string[];
  /** Agent policies the pack is assigned to. */
  policyIds: string[];
}

const compareQueries = (pack: StoredPack): string[] => {
  const differences: string[] = [];
  if (pack.enabled === false) differences.push('pack is disabled');
  // The pack-level interval is ignored by osquerybeat for a query that sets its own, so only
  // a differing pack interval is reported, not a missing one.
  if (pack.interval !== undefined && pack.interval !== INVENTORY_PACK_BODY.interval) {
    differences.push(`interval is ${pack.interval}, expected ${INVENTORY_PACK_BODY.interval}`);
  }
  const stored = new Map((pack.queries ?? []).map((query) => [query.id, query]));
  for (const expected of Object.values(INVENTORY_PACK_BODY.queries)) {
    const actual = stored.get(expected.id);
    if (!actual) {
      differences.push(`query ${expected.id} is missing`);
    } else if (
      actual.query !== expected.query ||
      actual.platform !== expected.platform ||
      actual.snapshot !== expected.snapshot
    ) {
      differences.push(`query ${expected.id} differs`);
    }
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
  differences: string[];
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { InventoryQueryKind } from './queries';
import { INVENTORY_QUERIES } from './queries';

/** Saved object type of osquery packs (owned by the osquery plugin). */
export const OSQUERY_PACK_SO_TYPE = 'osquery-pack';
export const INVENTORY_PACK_NAME = 'software-inventory';

/** Separator osquery puts between space id and pack name in pack keys. */
const PACK_KEY_SEPARATOR = '--';
const PER_PAGE = 100;

interface PackQueryAttributes {
  id?: string;
  schedule_id?: string;
}

interface PackAttributes {
  name?: string;
  queries?: PackQueryAttributes[];
}

const KIND_BY_QUERY_ID = new Map<string, InventoryQueryKind>(
  (Object.entries(INVENTORY_QUERIES) as Array<[InventoryQueryKind, { id: string }]>).map(
    ([kind, { id }]) => [id, kind]
  )
);

/**
 * Every `schedule_id` osquerybeat may stamp on a result of the inventory pack's queries, per query
 * kind, across all spaces. A query reports under its minted `schedule_id` when it has one, and
 * under the legacy `pack_<name>_<query>` or `pack_<space>--<name>_<query>` key otherwise, so all
 * three are returned.
 */
export const findInventoryScheduleIds = async (
  repository: ISavedObjectsRepository
): Promise<Partial<Record<InventoryQueryKind, string[]>>> => {
  const ids: Partial<Record<InventoryQueryKind, Set<string>>> = {};
  for (let page = 1; ; page++) {
    const { saved_objects: packs, total } = await repository.find<PackAttributes>({
      type: OSQUERY_PACK_SO_TYPE,
      namespaces: ['*'],
      search: `"${INVENTORY_PACK_NAME}"`,
      searchFields: ['name'],
      perPage: PER_PAGE,
      page,
    });
    for (const { attributes, namespaces } of packs) {
      // `name` is a text field, so the search is fuzzy; keep exact names only.
      if (attributes.name !== INVENTORY_PACK_NAME) continue;
      const spaceId = namespaces?.[0];
      for (const query of attributes.queries ?? []) {
        const kind = query.id ? KIND_BY_QUERY_ID.get(query.id) : undefined;
        if (!kind || !query.id) continue;
        const set = (ids[kind] ??= new Set());
        if (query.schedule_id) set.add(query.schedule_id);
        set.add(`pack_${INVENTORY_PACK_NAME}_${query.id}`);
        if (spaceId && spaceId !== '*') {
          set.add(`pack_${spaceId}${PACK_KEY_SEPARATOR}${INVENTORY_PACK_NAME}_${query.id}`);
        }
      }
    }
    if (packs.length === 0 || page * PER_PAGE >= total) break;
  }
  return Object.fromEntries(Object.entries(ids).map(([kind, set]) => [kind, [...set]])) as Partial<
    Record<InventoryQueryKind, string[]>
  >;
};

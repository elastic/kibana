/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryLink } from '@kbn/significant-events-schema';
import type { getLiveEntities } from './get_live_entities';

/**
 * Keeps links whose query names a selected entity, or, for Unassigned, names no live entity. Runs
 * before pagination so the total and the page reflect the selection.
 */
export const filterQueryLinksByEntity = async (
  links: QueryLink[],
  { entityIds = [], unassignedEntities }: { entityIds?: string[]; unassignedEntities?: boolean },
  loadLiveEntities: () => ReturnType<typeof getLiveEntities>
): Promise<QueryLink[]> => {
  const live = unassignedEntities ? await loadLiveEntities() : undefined;
  // A truncated live set would misreport entities past the cap as unassigned, so skip Unassigned.
  const liveIds = live && !live.truncated ? new Set(live.entities.map(({ id }) => id)) : undefined;
  if (entityIds.length === 0 && !liveIds) {
    return links;
  }
  const selected = new Set(entityIds);
  return links.filter(({ query }) => {
    const ids = (query.features ?? []).map(({ id }) => id);
    return (
      ids.some((id) => selected.has(id)) || Boolean(liveIds && !ids.some((id) => liveIds.has(id)))
    );
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityStoreCRUDClient } from '@kbn/entity-store/server';

/**
 * Looks up candidate EUIDs in the Entity Store via `listEntities` with a
 * terms filter on `entity.id` — the same sanctioned pattern the detection
 * engine's entity-store enrichment uses (document `_id` is a private SHA-256
 * hash of the EUID, so there is no direct get-by-EUID).
 *
 * Best-effort: any lookup failure (entity store not installed, index missing)
 * returns an empty set so correlation degrades to observables-only.
 */
export const findMatchedEuids = async ({
  crudClient,
  euids,
  logger,
}: {
  crudClient: EntityStoreCRUDClient | undefined;
  euids: string[];
  logger: Logger;
}): Promise<Set<string>> => {
  if (crudClient == null || euids.length === 0) {
    return new Set();
  }

  try {
    const { entities } = await crudClient.listEntities({
      filter: { terms: { 'entity.id': euids } },
      size: euids.length,
      source: ['entity.id'],
    });

    return new Set(
      entities
        .map((entity) => entity?.entity?.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );
  } catch (error) {
    logger.debug(
      () =>
        `[CORRELATE] Entity Store lookup failed; treating all EUID candidates as unmatched: ${
          error instanceof Error ? error.message : String(error)
        }`
    );

    return new Set();
  }
};

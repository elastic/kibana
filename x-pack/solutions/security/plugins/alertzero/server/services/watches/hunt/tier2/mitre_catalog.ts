/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type {
  MitreEntity,
  MitreSubtechnique,
  MitreTechnique,
} from '@kbn/security-mitre-attack-common';

/**
 * The slice of a MITRE ATT&CK Enterprise technique or sub-technique that Tier 2
 * validation needs. `id` is always a live (non-revoked, non-deprecated) id:
 * when a revoked id is looked up, the entry returned is its live successor.
 */
export interface MitreCatalogEntry {
  id: string;
  name: string;
  reference: string;
  tacticIds: string[];
  /** Parent technique id, present only for sub-techniques. */
  parentTechniqueId?: string;
}

export interface MitreCatalog {
  techniqueById: ReadonlyMap<string, MitreCatalogEntry>;
  subtechniqueById: ReadonlyMap<string, MitreCatalogEntry>;
}

type TechniqueLike = MitreTechnique | MitreSubtechnique;

const isTechniqueLike = (entity: MitreEntity): entity is TechniqueLike =>
  entity.type === 'technique' || entity.type === 'subtechnique';

const isLive = (entity: TechniqueLike): boolean => !entity.revoked && !entity.deprecated;

const toEntry = (entity: TechniqueLike): MitreCatalogEntry => ({
  id: entity.id,
  name: entity.name,
  reference: entity.reference,
  tacticIds: entity.tactic_ids,
  ...(entity.type === 'subtechnique' ? { parentTechniqueId: entity.technique_id } : {}),
});

/**
 * Builds the Tier 2 lookup maps from a flat list of ATT&CK Enterprise entities.
 * Pure: the caller is responsible for passing a single framework. Deprecated
 * entries are dropped. Revoked entries that name exactly one live successor
 * in `superseded_by_id` resolve to that successor, so an LLM that still emits
 * a retired id (for example `T1562.001`) lands on the current technique
 * instead of being dropped as unknown; revoked entries with no single live
 * successor are dropped.
 */
export const buildMitreCatalog = (entities: MitreEntity[]): MitreCatalog => {
  const techniqueById = new Map<string, MitreCatalogEntry>();
  const subtechniqueById = new Map<string, MitreCatalogEntry>();

  const techniqueLike = entities.filter(isTechniqueLike);
  const liveById = new Map<string, TechniqueLike>();
  for (const entity of techniqueLike) {
    if (!isLive(entity)) continue;
    liveById.set(entity.id, entity);
    const target = entity.type === 'technique' ? techniqueById : subtechniqueById;
    target.set(entity.id, toEntry(entity));
  }

  for (const entity of techniqueLike) {
    if (!entity.revoked || liveById.has(entity.id)) continue;
    const successors = (entity.superseded_by_id ?? []).filter((id) => liveById.has(id));
    if (successors.length !== 1) continue;
    const successor = liveById.get(successors[0]);
    if (!successor) continue;
    const target = successor.type === 'technique' ? techniqueById : subtechniqueById;
    target.set(entity.id, toEntry(successor));
  }

  return { techniqueById, subtechniqueById };
};

const EMPTY_CATALOG: MitreCatalog = {
  techniqueById: new Map(),
  subtechniqueById: new Map(),
};

// Keyed by client so a fresh client (tests, or a future client swap) never sees a stale catalog.
const catalogByClient = new WeakMap<MitreAttackDataClient, MitreCatalog>();

/**
 * Loads the ATT&CK Enterprise catalog from the managed MITRE data client and memoizes it per client.
 *
 * An empty collection (population not finished) or a missing client yields an empty catalog
 * that is not cached, so the next call retries.
 */
export const getMitreCatalog = async ({
  mitreDataClient,
  logger,
}: {
  mitreDataClient?: MitreAttackDataClient;
  logger?: Logger;
} = {}): Promise<MitreCatalog> => {
  if (!mitreDataClient) {
    logger?.debug('MITRE data client is unavailable');
    return EMPTY_CATALOG;
  }

  const cached = catalogByClient.get(mitreDataClient);
  if (cached) return cached;

  let techniques: MitreTechnique[];
  let subtechniques: MitreSubtechnique[];
  try {
    ({ techniques, subtechniques } = await mitreDataClient.list({
      framework: 'enterprise',
      status: 'all',
    }));
  } catch (error) {
    // A transient read failure must not fail the hunt, retry on the next call.
    logger?.warn(
      `Failed to load the MITRE catalog; Technique validation is skipped for this run: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return EMPTY_CATALOG;
  }
  if (techniques.length === 0 && subtechniques.length === 0) {
    logger?.debug('MITRE collection is empty (not populated yet); not caching catalog');
    return EMPTY_CATALOG;
  }

  const catalog = buildMitreCatalog([...techniques, ...subtechniques]);
  catalogByClient.set(mitreDataClient, catalog);
  return catalog;
};

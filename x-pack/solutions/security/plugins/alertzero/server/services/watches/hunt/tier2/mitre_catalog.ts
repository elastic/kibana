/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';
import type {
  MitreEntity,
  MitreSubtechnique,
  MitreTechnique,
} from '@kbn/security-mitre-attack-common';

/**
 * The slice of a MITRE ATT&CK technique or sub-technique that Tier 2
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
 * Builds the Tier 2 lookup maps from the flat ATT&CK entity list. Deprecated
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

let cached: MitreCatalog | undefined;

/**
 * Lazily loads the ATT&CK artifact shipped by `@kbn/security-mitre-attack-server`
 * and memoizes the derived lookups. The artifact read and parse happen on the
 * first Tier 2 run, not at plugin load.
 */
export const getMitreCatalog = (): MitreCatalog => {
  if (!cached) {
    cached = buildMitreCatalog(loadMitreArtifact());
  }
  return cached;
};

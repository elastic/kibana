/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { Asset, EntityField } from '@kbn/entity-store/common/domain/definitions/entity.gen';
import type { LeadEntity, Observation } from '../types';

/**
 * Creates an Observation, automatically filling entityId and moduleId.
 * Every builder in every module uses this to avoid boilerplate.
 */
export const makeObservation = (
  entity: LeadEntity,
  moduleId: string,
  fields: Omit<Observation, 'entityId' | 'moduleId'>
): Observation => ({ entityId: entity.id, moduleId, ...fields });

/** Reads the nested `entity` field common to all Entity Store V2 record types. */
export const getEntityField = (entity: LeadEntity): Record<string, unknown> | undefined =>
  (entity.record as Record<string, unknown>).entity as Record<string, unknown> | undefined;

/**
 * Watchlist ID prefix for privileged-user monitoring.
 * A space-scoped suffix may be appended (e.g. `...-default`),
 * so consumers should match with `startsWith`.
 */
export const PRIVILEGED_USER_WATCHLIST_ID = 'privileged-user-monitoring-watchlist-id';

/**
 * Returns true if `watchlists` contains an entry whose prefix matches the
 * privileged-user watchlist ID. Centralises the rule so that any caller
 * inspecting a raw `entity.attributes.watchlists` (current or historical
 * snapshot) gets the same answer.
 */
export const matchesPrivilegedWatchlist = (watchlists: unknown): boolean => {
  if (!Array.isArray(watchlists)) return false;
  return watchlists.some(
    (w) => typeof w === 'string' && w.startsWith(PRIVILEGED_USER_WATCHLIST_ID)
  );
};

/** Returns true if the entity is on a privileged-user monitoring watchlist. */
export const extractIsPrivileged = (entity: LeadEntity): boolean =>
  matchesPrivilegedWatchlist(getEntityAttributes(entity)?.watchlists);

/** High-impact asset criticality tiers (see `AssetCriticalityLevel`). */
const HIGH_CRITICALITY_LEVELS: ReadonlySet<string> = new Set(['high_impact', 'extreme_impact']);

/**
 * Reads `asset.criticality` from the entity record root (it lives at the record
 * top level, not under the `entity` namespace). Returns `undefined` when absent.
 */
const AssetCriticalitySchema = Asset.pick({ criticality: true }).strip();
export const getAssetCriticality = (entity: LeadEntity): string | undefined => {
  const parsed = AssetCriticalitySchema.safeParse((entity.record as Record<string, unknown>).asset);
  if (!parsed.success) return;
  const { criticality } = parsed.data;
  return typeof criticality === 'string' ? criticality : undefined;
};

/** Returns true when the entity's asset criticality is a high-impact tier. */
export const isHighCriticality = (
  params: { entity: LeadEntity } | { criticality: string }
): boolean => {
  const criticality = 'entity' in params ? getAssetCriticality(params.entity) : params.criticality;
  return criticality != null && HIGH_CRITICALITY_LEVELS.has(criticality);
};

const EntityRiskSchema = EntityField.shape.risk;
export const getEntityRisk = (entity: LeadEntity) => {
  const entityField = getEntityField(entity);
  if (!entityField) return;

  const parsed = EntityRiskSchema.safeParse(entityField.risk);
  if (!parsed.success || parsed.data == null) return;

  return {
    calculatedLevel: parsed.data.calculated_level,
    calculatedScoreNorm: parsed.data.calculated_score_norm,
  };
};

const EntityAttributesSchema = EntityField.shape.attributes
  .unwrap()
  .pick({
    managed: true,
    mfa_enabled: true,
    watchlists: true,
  })
  .strip();
export type EntityAttributes = z.infer<typeof EntityAttributesSchema>;
export const getEntityAttributes = (entity: LeadEntity): EntityAttributes | undefined => {
  const parsed = EntityAttributesSchema.safeParse(getEntityField(entity)?.attributes);
  if (!parsed.success) return;
  return parsed.data;
};

const EntityLifecycleSchema = EntityField.shape.lifecycle
  .unwrap()
  .pick({ first_seen: true, last_seen: true })
  .strip();
export const getEntityLifecycle = (entity: LeadEntity) => {
  const parsed = EntityLifecycleSchema.safeParse(getEntityField(entity)?.lifecycle);
  if (!parsed.success) return;
  return parsed.data;
};

/** Capitalises the entity type for use in human-readable descriptions (e.g. "host" → "Host"). */
export const entityTypeLabel = (entity: LeadEntity): string =>
  entity.type.charAt(0).toUpperCase() + entity.type.slice(1);

/** Groups entities by their type field. */
export const groupEntitiesByType = (entities: LeadEntity[]): Map<string, LeadEntity[]> =>
  entities.reduce((map, e) => {
    const existing = map.get(e.type) ?? [];
    map.set(e.type, [...existing, e]);
    return map;
  }, new Map<string, LeadEntity[]>());

/**
 * Extracts a printable message from an unknown thrown value. Use this in catch
 * blocks instead of interpolating `${error}` directly: a plain object thrown
 * by the ES client would render as `[object Object]` under template literals,
 * and a real Error's `toString()` prefixes the message with `Error: ` which
 * adds noise to log lines that already carry a module prefix.
 */
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

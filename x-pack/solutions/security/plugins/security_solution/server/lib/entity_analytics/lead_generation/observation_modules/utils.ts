/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LeadEntity, Observation } from '../types';

/** Returns a stable string key for a LeadEntity using the EUID: "type:id" */
export const entityToKey = (entity: LeadEntity): string => `${entity.type}:${entity.id}`;

/**
 * Creates an Observation, automatically filling entityId and moduleId.
 * Every builder in every module uses this to avoid boilerplate.
 */
export const makeObservation = (
  entity: LeadEntity,
  moduleId: string,
  fields: Omit<Observation, 'entityId' | 'moduleId'>
): Observation => ({ entityId: entityToKey(entity), moduleId, ...fields });

/** Reads the nested `entity` field common to all Entity Store V2 record types. */
export const getEntityField = (entity: LeadEntity): Record<string, unknown> | undefined =>
  (entity.record as Record<string, unknown>).entity as Record<string, unknown> | undefined;

/** Returns true if the entity currently has the Privileged attribute set. */
export const extractIsPrivileged = (entity: LeadEntity): boolean => {
  const attrs = getEntityField(entity)?.attributes as { privileged?: boolean } | undefined;
  return attrs?.privileged === true;
};

/** Groups entities by their type field. */
export const groupEntitiesByType = (entities: LeadEntity[]): Map<string, LeadEntity[]> => {
  const map = new Map<string, LeadEntity[]>();
  for (const e of entities) {
    const group = map.get(e.type);
    if (group) {
      group.push(e);
    } else {
      map.set(e.type, [e]);
    }
  }
  return map;
};

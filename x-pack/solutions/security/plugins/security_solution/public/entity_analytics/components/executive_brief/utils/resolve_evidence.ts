/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefEntity,
  BriefSnapshot,
  EvidenceEntry,
  EvidenceId,
  Storyline,
} from '../../../../../common/entity_analytics/executive_brief/types';

export const getEvidence = (snapshot: BriefSnapshot, id: EvidenceId): EvidenceEntry | undefined =>
  snapshot.catalog[id];

/** Resolves an ENT-* evidence id (or a raw euid) to the snapshot entity. */
export const getEntityByEvidenceId = (
  snapshot: BriefSnapshot,
  id: EvidenceId
): BriefEntity | undefined => {
  const entry = snapshot.catalog[id];
  if (entry?.kind !== 'entity') return undefined;
  return snapshot.entities[entry.euid];
};

export const getEntityByEuid = (snapshot: BriefSnapshot, euid: string): BriefEntity | undefined =>
  snapshot.entities[euid];

export const getStoryline = (snapshot: BriefSnapshot, storylineId: string): Storyline | undefined =>
  snapshot.storylines.storylines.find(({ evidenceId }) => evidenceId === storylineId);

export const getTacticName = (snapshot: BriefSnapshot, tacticId: string): string => {
  const stage = snapshot.blindSpots.attackStages.stages.find((s) => s.tacticId === tacticId);
  return stage?.tacticName ?? tacticId;
};

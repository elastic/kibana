/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefSnapshot } from '../../../../../common/entity_analytics/executive_brief/types';

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Splits prose into sentences. Whitespace-delimited so names such as `a.rodriguez` stay intact. */
export const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

export interface EntityMention {
  /** Golden euids this surface form maps to (more than one when display names collide). */
  euids: string[];
  /** The matched text as written in the prose. */
  text: string;
  start: number;
  end: number;
}

export interface EntityIndex {
  /** Lower-cased surface form (display name, euid, alias euid, ENT-n) to golden euids. */
  surfaceToEuids: Map<string, string[]>;
  /** Display name for a golden euid (falls back to the euid). */
  displayName: (euid: string) => string;
  /** Every surface form, longest first, for masking. */
  surfaceForms: string[];
}

const MIN_SURFACE_LENGTH = 2;

export const buildEntityIndex = (snapshot: BriefSnapshot): EntityIndex => {
  const surfaceToEuids = new Map<string, string[]>();
  const names = new Map<string, string>();

  const add = (surface: string | undefined, euid: string): void => {
    if (!surface || surface.length < MIN_SURFACE_LENGTH) {
      return;
    }
    const key = surface.toLowerCase();
    const existing = surfaceToEuids.get(key) ?? [];
    if (!existing.includes(euid)) {
      surfaceToEuids.set(key, [...existing, euid]);
    }
  };

  Object.values(snapshot.entities).forEach((entity) => {
    names.set(entity.euid, entity.name);
    add(entity.name, entity.euid);
    add(entity.euid, entity.euid);
    add(entity.evidenceId, entity.euid);
    entity.aliases.forEach((alias) => add(alias, entity.euid));
  });

  return {
    surfaceToEuids,
    displayName: (euid) => names.get(euid) ?? euid,
    surfaceForms: [...surfaceToEuids.keys()].sort((a, b) => b.length - a.length),
  };
};

/**
 * Finds entity mentions (display name, euid, alias euid or ENT-n id) in one sentence.
 * Overlapping matches are resolved in favour of the longest surface form.
 */
export const findEntityMentions = (sentence: string, index: EntityIndex): EntityMention[] => {
  const candidates: EntityMention[] = [];
  index.surfaceForms.forEach((surface) => {
    const euids = index.surfaceToEuids.get(surface);
    if (!euids) {
      return;
    }
    const pattern = new RegExp(`(?<![\\w.-])${escapeRegExp(surface)}(?![\\w@-]|\\.\\w)`, 'gi');
    for (const match of sentence.matchAll(pattern)) {
      const start = match.index ?? 0;
      candidates.push({ euids, text: match[0], start, end: start + match[0].length });
    }
  });

  const accepted: EntityMention[] = [];
  [...candidates]
    .sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)
    .forEach((candidate) => {
      const overlaps = accepted.some((m) => candidate.start < m.end && m.start < candidate.end);
      if (!overlaps) {
        accepted.push(candidate);
      }
    });
  return accepted.sort((a, b) => a.start - b.start);
};

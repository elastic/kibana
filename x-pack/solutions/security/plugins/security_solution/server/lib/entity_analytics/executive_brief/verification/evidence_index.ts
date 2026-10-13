/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import type {
  Evidence,
  Fact,
  Link,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { entityDisplayName } from '../entity_record';

/** Lookup tables over the evidence a brief was composed from. */
export interface EvidenceIndex {
  readonly evidence: Evidence;
  /** Entity Store records by EUID. */
  readonly entities: ReadonlyMap<string, Entity>;
  readonly facts: ReadonlyMap<number, Fact>;
  readonly links: ReadonlyMap<number, Link>;
  /** Matches the entities' EUIDs and names that contain digits, so they aren't read as numbers. */
  readonly identifierPattern?: RegExp;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildEvidenceIndex = (evidence: Evidence): EvidenceIndex => {
  const entities = new Map<string, Entity>(Object.entries(evidence.entities));
  const facts = new Map<number, Fact>(evidence.facts.map((fact) => [fact.id, fact]));
  const links = new Map<number, Link>(evidence.links.map((link) => [link.id, link]));
  const identifiers = unique(
    [...entities].flatMap(([euid, record]) => [
      euid,
      entityDisplayName(record, euid),
      record.entity?.name ?? '',
    ])
  )
    .filter((identifier) => /\d/.test(identifier))
    .sort((a, b) => b.length - a.length);
  return {
    evidence,
    entities,
    facts,
    links,
    ...(identifiers.length > 0
      ? { identifierPattern: new RegExp(identifiers.map(escapeRegExp).join('|'), 'gi') }
      : {}),
  };
};

/** True when the ids include at least one fact or link of the evidence. */
export const hasFactOrLink = (
  index: EvidenceIndex,
  factIds: readonly number[],
  linkIds: readonly number[]
): boolean =>
  factIds.some((id) => index.facts.has(id)) || linkIds.some((id) => index.links.has(id));

/** Facts cited directly, plus the facts behind cited links. */
export const citedFacts = (
  index: EvidenceIndex,
  factIds: readonly number[],
  linkIds: readonly number[]
): Fact[] => {
  const result = new Map<number, Fact>();
  const add = (id: number): void => {
    const fact = index.facts.get(id);
    if (fact) {
      result.set(fact.id, fact);
    }
  };
  factIds.forEach(add);
  linkIds.forEach((id) => index.links.get(id)?.factIds.forEach(add));
  return [...result.values()];
};

/** Unique values, first occurrence wins. */
export const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

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
  readonly facts: ReadonlyMap<string, Fact>;
  readonly links: ReadonlyMap<string, Link>;
  /** Matches the entities' EUIDs and names that contain digits, so they aren't read as numbers. */
  readonly identifierPattern?: RegExp;
}

/** Any fact or link id written in prose. */
export const EVIDENCE_ID_PATTERN = /(?<![\w-])(?:F|L)-\d+(?![\w-])/g;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildEvidenceIndex = (evidence: Evidence): EvidenceIndex => {
  const entities = new Map<string, Entity>(Object.entries(evidence.entities));
  const facts = new Map<string, Fact>(evidence.facts.map((fact) => [fact.id, fact]));
  const links = new Map<string, Link>(evidence.links.map((link) => [link.id, link]));
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

/** True for the fact and link ids of the evidence: the only ids a claim can cite. */
export const isKnownId = (index: EvidenceIndex, id: string): boolean =>
  index.facts.has(id) || index.links.has(id);

/** True when the ids include at least one fact or link: entities alone back no claim. */
export const hasFactOrLink = (index: EvidenceIndex, ids: readonly string[]): boolean =>
  ids.some((id) => index.facts.has(id) || index.links.has(id));

/** Facts cited directly, plus the facts behind cited links. */
export const citedFacts = (index: EvidenceIndex, ids: readonly string[]): Fact[] => {
  const result = new Map<string, Fact>();
  ids.forEach((id) => {
    const fact = index.facts.get(id);
    if (fact) {
      result.set(fact.id, fact);
    }
    index.links.get(id)?.factIds.forEach((factId) => {
      const backing = index.facts.get(factId);
      if (backing) {
        result.set(backing.id, backing);
      }
    });
  });
  return [...result.values()];
};

/** Unique values, first occurrence wins. */
export const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

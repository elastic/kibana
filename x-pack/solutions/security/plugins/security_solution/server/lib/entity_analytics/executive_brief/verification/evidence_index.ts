/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BriefEntity,
  Evidence,
  Fact,
  Link,
} from '../../../../../common/entity_analytics/executive_brief/evidence';

/** Lookup tables over the evidence a brief was composed from. */
export interface EvidenceIndex {
  readonly evidence: Evidence;
  readonly entities: ReadonlyMap<string, BriefEntity>;
  readonly facts: ReadonlyMap<string, Fact>;
  readonly links: ReadonlyMap<string, Link>;
  /** True when there is nothing a claim could cite (a quiet tenant). */
  readonly isEmpty: boolean;
}

/** Any evidence id written in prose. */
export const EVIDENCE_ID_PATTERN = /(?<![\w-])(?:ENT|F|L)-\d+(?![\w-])/g;

export const isEntityId = (id: string): boolean => /^ENT-\d+$/.test(id);

export const buildEvidenceIndex = (evidence: Evidence): EvidenceIndex => {
  const entities = new Map<string, BriefEntity>(
    Object.values(evidence.entities).map((entity) => [entity.id, entity])
  );
  const facts = new Map<string, Fact>(evidence.facts.map((fact) => [fact.id, fact]));
  const links = new Map<string, Link>(evidence.links.map((link) => [link.id, link]));
  return {
    evidence,
    entities,
    facts,
    links,
    isEmpty: facts.size === 0 && links.size === 0,
  };
};

export const isKnownId = (index: EvidenceIndex, id: string): boolean =>
  index.entities.has(id) || index.facts.has(id) || index.links.has(id);

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

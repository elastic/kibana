/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefThreat } from '../../../../../common/entity_analytics/executive_brief/brief';
import type { EvidenceIndex } from './evidence_index';
import { hasFactOrLink } from './evidence_index';
import type { BriefCheck, CheckOutcome, ItemPath } from './types';
import { emptyOutcome } from './types';

/**
 * Splits entities into connected components, using only the provided links and facts that name
 * two or more of them. Components keep the input order; the first holds the first entity.
 */
export const connectedComponents = (
  entities: readonly string[],
  index: EvidenceIndex
): string[][] => {
  const members = new Set(entities);
  const adjacency = new Map<string, Set<string>>(entities.map((id) => [id, new Set<string>()]));
  const connect = (a: string, b: string): void => {
    if (a !== b && members.has(a) && members.has(b)) {
      adjacency.get(a)?.add(b);
      adjacency.get(b)?.add(a);
    }
  };
  index.evidence.links.forEach(({ from, to }) => connect(from, to));
  index.evidence.facts.forEach(({ entities: factEntities }) => {
    const inThreat = factEntities.filter((id) => members.has(id));
    inThreat.forEach((a, i) => inThreat.slice(i + 1).forEach((b) => connect(a, b)));
  });

  const seen = new Set<string>();
  const components: string[][] = [];
  entities.forEach((start) => {
    if (seen.has(start)) {
      return;
    }
    const reached = new Set<string>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift();
      adjacency.get(current ?? '')?.forEach((next) => {
        if (!reached.has(next)) {
          reached.add(next);
          queue.push(next);
        }
      });
    }
    reached.forEach((id) => seen.add(id));
    components.push(entities.filter((id) => reached.has(id)));
  });
  return components;
};

/** Keeps only the evidence that concerns the kept entities. */
const restrictThreat = (
  threat: BriefThreat,
  kept: readonly string[],
  index: EvidenceIndex
): BriefThreat => {
  const keep = new Set(kept);
  const touches = (ids: readonly string[]): boolean => ids.some((id) => keep.has(id));
  const relevant = (id: string): boolean => {
    if (index.entities.has(id)) {
      return keep.has(id);
    }
    const fact = index.facts.get(id);
    if (fact) {
      return touches(fact.entities);
    }
    const link = index.links.get(id);
    return link !== undefined && touches([link.from, link.to]);
  };
  return {
    ...threat,
    entities: [...kept],
    evidence: threat.evidence.filter(relevant),
    keyEvents: threat.keyEvents.filter(relevant),
  };
};

/**
 * Connectivity: each threat's entities must form one connected graph through the provided links
 * and shared facts. Otherwise the threat is cut down to its largest component (ties go to the
 * component holding the first-listed entity) and flagged, or dropped when no evidence is left.
 * This is the guard against the AI merging unrelated activity.
 */
export const checkConnectivity: BriefCheck = (brief, context): CheckOutcome => {
  const { index } = context;
  const outcome = emptyOutcome(brief);
  const threats = brief.threats.map((threat, i) => {
    const path: ItemPath = `threats[${i}]`;
    if (context.dropped.has(path) || threat.entities.length < 2) {
      return threat;
    }
    const components = connectedComponents(threat.entities, index);
    if (components.length === 1) {
      return threat;
    }
    const largest = components.reduce((best, component) =>
      component.length > best.length ? component : best
    );
    const removed = threat.entities.filter((id) => !largest.includes(id));
    const restricted = restrictThreat(threat, largest, index);
    if (!hasFactOrLink(index, [...restricted.evidence, ...restricted.keyEvents])) {
      outcome.drops.push({
        path,
        check: 'connectivity',
        reason: `entities ${threat.entities.join(
          ', '
        )} are not connected by links or shared facts, and no cited evidence concerns the largest connected group`,
      });
      return threat;
    }
    outcome.flags.push({
      path: `${path}.entities`,
      check: 'connectivity',
      message: `${removed.join(
        ', '
      )} removed: not connected to the rest of the threat by a link or shared fact`,
    });
    return restricted;
  });
  outcome.brief = { ...brief, threats };
  return outcome;
};

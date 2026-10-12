/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefThreat } from '../../../../../common/entity_analytics/executive_brief/brief';
import type {
  BriefEntity,
  EaCapability,
  EntityId,
  Evidence,
  Fact,
  FactId,
  Link,
  LinkId,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { FACT_KIND_CAPABILITY } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { CAPABILITY_ORDER } from './constants';

const ENTITY_ID_PATTERN = /^ENT-\d+$/;
const FACT_ID_PATTERN = /^F-\d+$/;
const LINK_ID_PATTERN = /^L-\d+$/;

export const isEntityId = (id: string): id is EntityId => ENTITY_ID_PATTERN.test(id);
export const isFactId = (id: string): id is FactId => FACT_ID_PATTERN.test(id);
export const isLinkId = (id: string): id is LinkId => LINK_ID_PATTERN.test(id);

export const getEntity = (evidence: Evidence, id: string): BriefEntity | undefined =>
  isEntityId(id) ? evidence.entities[id] : undefined;

export const getFact = (evidence: Evidence, id: string): Fact | undefined =>
  isFactId(id) ? evidence.facts.find((fact) => fact.id === id) : undefined;

export const getLink = (evidence: Evidence, id: string): Link | undefined =>
  isLinkId(id) ? evidence.links.find((link) => link.id === id) : undefined;

const unique = <T>(items: readonly T[]): T[] => [...new Set(items)];

/** Resolves entity ids, dropping unknown ones. */
export const getEntities = (evidence: Evidence, ids: readonly string[]): BriefEntity[] =>
  unique(ids).flatMap((id) => {
    const entity = getEntity(evidence, id);
    return entity ? [entity] : [];
  });

/** Resolves fact ids in the order given, dropping unknown and repeated ones. */
export const getFacts = (evidence: Evidence, ids: readonly string[]): Fact[] =>
  unique(ids).flatMap((id) => {
    const fact = getFact(evidence, id);
    return fact ? [fact] : [];
  });

/** Facts a threat cites, either in its evidence list or as key events. */
export const getThreatFacts = (threat: BriefThreat, evidence: Evidence): Fact[] =>
  getFacts(evidence, [...threat.keyEvents, ...threat.evidence]);

/** The threat's key events, in the order the AI listed them (time order). */
export const getKeyEventFacts = (threat: BriefThreat, evidence: Evidence): Fact[] =>
  getFacts(evidence, threat.keyEvents);

/** Links the threat cites, plus links connecting two of its entities. */
export const getThreatLinks = (threat: BriefThreat, evidence: Evidence): Link[] => {
  const entityIds = new Set<string>(threat.entities);
  const cited = new Set<string>(threat.evidence);
  return evidence.links.filter(
    (link) => cited.has(link.id) || (entityIds.has(link.from) && entityIds.has(link.to))
  );
};

/** Response facts (alert handling and cases) among the given facts. */
export const getResponseFacts = (facts: readonly Fact[]): Fact[] =>
  facts.filter(({ kind }) => kind === 'alert_response' || kind === 'case');

const TACTIC_ORDER = [
  'reconnaissance',
  'resourcedevelopment',
  'initialaccess',
  'execution',
  'persistence',
  'privilegeescalation',
  'defenseevasion',
  'credentialaccess',
  'discovery',
  'lateralmovement',
  'collection',
  'commandandcontrol',
  'exfiltration',
  'impact',
];

const tacticKey = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '');

export const getFactTactics = (fact: Fact): string[] =>
  (fact.details?.tactics ?? '')
    .split(/[,;]|→/)
    .map((tactic) => tactic.trim())
    .filter(Boolean);

/** Unique tactics across the facts, in kill-chain order (unknown tactics keep their first-seen order, last). */
export const getTactics = (facts: readonly Fact[]): string[] => {
  const tactics = unique(facts.flatMap(getFactTactics));
  const rank = (tactic: string): number => {
    const index = TACTIC_ORDER.indexOf(tacticKey(tactic));
    return index === -1 ? TACTIC_ORDER.length : index;
  };
  return tactics
    .map((tactic, position) => ({ tactic, position }))
    .sort((a, b) => rank(a.tactic) - rank(b.tactic) || a.position - b.position)
    .map(({ tactic }) => tactic);
};

const RELATIONSHIP_LINK_TYPES: ReadonlySet<Link['type']> = new Set([
  'owns',
  'administers',
  'accesses_rarely',
  'accesses_frequently',
  'communicates_with',
  'supervises',
]);

/**
 * The Entity Analytics capabilities behind a threat, in display order. Fact kinds map to capabilities
 * directly; entity enrichment (resolution, criticality, watchlists) and relationship links add the rest.
 */
export const getHowFoundCapabilities = (
  threat: BriefThreat,
  evidence: Evidence
): EaCapability[] => {
  const found = new Set<EaCapability>(
    getThreatFacts(threat, evidence).map(({ kind }) => FACT_KIND_CAPABILITY[kind])
  );
  getEntities(evidence, threat.entities).forEach((entity) => {
    if (entity.aliasCount) found.add('entity_resolution');
    if (entity.watchlists?.length) found.add('watchlists');
    if (entity.criticality && entity.criticality !== 'unassigned') found.add('asset_criticality');
  });
  if (getThreatLinks(threat, evidence).some(({ type }) => RELATIONSHIP_LINK_TYPES.has(type))) {
    found.add('relationships');
  }
  return CAPABILITY_ORDER.filter((capability) => found.has(capability));
};

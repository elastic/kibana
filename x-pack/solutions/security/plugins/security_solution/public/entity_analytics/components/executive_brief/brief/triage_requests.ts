/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Brief,
  BriefAction,
  BriefThreat,
} from '../../../../../common/entity_analytics/executive_brief/brief';
import type {
  BriefEntity,
  Evidence,
  Fact,
  Link,
  LinkType,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { LINK_VERBS } from '../../../../../common/entity_analytics/executive_brief/evidence';
import type { TriageRequest } from '../actions/brief_actions_context';
import {
  getEntities,
  getEntity,
  getFacts,
  getLink,
  getResponseFacts,
  getTactics,
  getThreatFacts,
  getThreatLinks,
} from '../evidence/resolve';
import { OWNER_LABEL, URGENCY_LABEL } from './actions/labels';
import { resolveTriageRequest } from '../evidence/brief_text';

/**
 * Triage requests for the Agent Builder. Pure and deterministic. The text is sent as-is and stays
 * English (not i18n). Internal ids (entity store ids, case and rule ids) are never included:
 * evidence is described by display names, times and the numbers the signals produced.
 */

const MAX_FACT_LINES = 20;
const MAX_LINK_LINES = 12;

const SYMMETRIC_LINK_TYPES: ReadonlySet<LinkType> = new Set([
  'same_attack',
  'co_alert',
  'same_lead',
]);

const humanise = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

const capped = (lines: string[], max: number): string[] =>
  lines.length > max ? [...lines.slice(0, max), `- ... and ${lines.length - max} more`] : lines;

const describeEntity = (entity: BriefEntity): string => {
  const traits = [
    entity.type,
    entity.criticality && entity.criticality !== 'unassigned'
      ? `criticality ${humanise(entity.criticality)}`
      : undefined,
    entity.privileged ? 'privileged' : undefined,
    entity.riskLevel && entity.riskLevel !== 'Unknown'
      ? `risk ${entity.riskLevel}${entity.riskScore === undefined ? '' : ` (${entity.riskScore})`}`
      : undefined,
    entity.watchlists?.length ? `watchlists ${entity.watchlists.join(', ')}` : undefined,
    entity.aliasCount ? `${entity.aliasCount} resolved aliases` : undefined,
  ].filter(Boolean);
  return `- ${entity.name} (${traits.join('; ')})`;
};

const factLine = (fact: Fact): string => {
  const numbers = Object.entries(fact.numbers ?? {}).map(
    ([key, value]) => `${humanise(key)} ${value}`
  );
  const details = Object.entries(fact.details ?? {}).map(
    ([key, value]) => `${humanise(key)} ${value}`
  );
  const qualifiers = [
    fact.severity ? `severity ${fact.severity}` : undefined,
    ...numbers,
    ...details,
  ]
    .filter(Boolean)
    .join('; ');
  const when = fact.at ? `${fact.at}: ` : '';
  return `- ${when}${fact.title}${qualifiers ? ` (${qualifiers})` : ''}`;
};

const linkLine = (link: Link, evidence: Evidence): string[] => {
  const from = getEntity(evidence, link.from);
  const to = getEntity(evidence, link.to);
  if (!from || !to) return [];
  const verb = LINK_VERBS[link.type];
  const since = link.firstSeen ? ` (first seen ${link.firstSeen})` : '';
  return SYMMETRIC_LINK_TYPES.has(link.type)
    ? [`- ${from.name} and ${to.name}: ${verb}${since}`]
    : [`- ${from.name} ${verb} ${to.name}${since}`];
};

const sortByTime = (facts: readonly Fact[]): Fact[] =>
  [...facts].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));

const factSection = (facts: readonly Fact[]): string[] =>
  facts.length > 0 ? capped(sortByTime(facts).map(factLine), MAX_FACT_LINES) : ['- None recorded'];

const linkSection = (links: readonly Link[], evidence: Evidence): string[] => {
  const lines = links.flatMap((link) => linkLine(link, evidence));
  return lines.length > 0 ? capped(lines, MAX_LINK_LINES) : ['- None recorded'];
};

const responseLine = (threat: BriefThreat, evidence: Evidence): string => {
  const facts = getResponseFacts(getThreatFacts(threat, evidence));
  const cases = facts.filter(({ kind }) => kind === 'case').map(({ title }) => title);
  const alerts = facts
    .filter(({ kind }) => kind === 'alert_response')
    .map(({ numbers }) => numbers ?? {});
  const sum = (key: string): number =>
    alerts.reduce((total, numbers) => total + (numbers[key] ?? 0), 0);
  const alertText =
    alerts.length > 0
      ? `; alerts open ${sum('open')}, acknowledged ${sum('acknowledged')}, closed ${sum('closed')}`
      : '';
  const caseText = cases.length > 0 ? `; cases: ${cases.join('; ')}` : '; no case';
  return `Response: ${humanise(threat.status)}${alertText}${caseText}`;
};

/** Triage request for one priority threat. `rank` is its 1-based position in the brief. */
const buildThreatTriageRequestRaw = ({
  threat,
  rank,
  evidence,
}: {
  threat: BriefThreat;
  rank: number;
  evidence: Evidence;
}): TriageRequest => {
  const facts = getThreatFacts(threat, evidence);
  const tactics = getTactics(facts);
  return {
    instruction: [
      `Triage priority threat ${rank} ("${threat.title}") from the Entity Analytics executive brief. The evidence is attached below.`,
      'First, verify from the live data whether this is a real compromise or benign activity, and say what you checked.',
      'Then check for related activity beyond the listed entities, recommend containment steps, and say whether a case should be opened and who should own it.',
    ].join('\n'),
    evidenceMarkdown: [
      `## Priority threat ${rank}: ${threat.title}`,
      '',
      `Severity: ${threat.severity}; confidence: ${threat.confidence}`,
      responseLine(threat, evidence),
      '',
      '### Entities',
      ...getEntities(evidence, threat.entities).map(describeEntity),
      '',
      '### Tactics observed',
      tactics.length > 0 ? tactics.join(' → ') : 'None recorded',
      '',
      '### Facts',
      ...factSection(facts),
      '',
      '### How the entities are connected',
      ...linkSection(getThreatLinks(threat, evidence), evidence),
      '',
      `Suggested next step: ${threat.nextStep.action}`,
    ].join('\n'),
  };
};

/** Triage request for one recommended action, with the threat it relates to when there is one. */
const buildActionTriageRequestRaw = ({
  action,
  brief,
  evidence,
}: {
  action: BriefAction;
  brief: Brief;
  evidence: Evidence;
}): TriageRequest => {
  const threat = action.threat === undefined ? undefined : brief.threats[action.threat - 1];
  const actionFacts = getFacts(evidence, action.evidence);
  const facts = sortByTime([...actionFacts, ...(threat ? getThreatFacts(threat, evidence) : [])]);
  const uniqueFacts = facts.filter((fact, index) => facts.indexOf(fact) === index);
  const citedLinks = action.evidence.flatMap((id) => {
    const link = getLink(evidence, id);
    return link ? [link] : [];
  });
  const links = [...citedLinks, ...(threat ? getThreatLinks(threat, evidence) : [])];
  const uniqueLinks = links.filter((link, index) => links.indexOf(link) === index);
  const tactics = getTactics(uniqueFacts);
  const targets = getEntities(evidence, action.targets);

  return {
    instruction: [
      `Help me carry out this recommended action from the Entity Analytics executive brief: "${action.action}". The evidence is attached below.`,
      'First, verify from the live data that the situation described still holds, and say what you checked.',
      'Then lay out the concrete steps, who should do them, and what to confirm afterwards.',
    ].join('\n'),
    evidenceMarkdown: [
      '## Recommended action',
      '',
      action.action,
      '',
      `Urgency: ${URGENCY_LABEL[action.urgency]}; owner: ${OWNER_LABEL[action.owner]}`,
      `Rationale: ${action.rationale}`,
      ...(threat
        ? [`Relates to priority threat ${action.threat}: ${threat.title} (${threat.severity})`]
        : []),
      '',
      '### Targets',
      ...(targets.length > 0 ? targets.map(describeEntity) : ['- None recorded']),
      '',
      ...(tactics.length > 0 ? ['### Tactics observed', tactics.join(' → '), ''] : []),
      '### Facts',
      ...factSection(uniqueFacts),
      '',
      '### How the entities are connected',
      ...linkSection(uniqueLinks, evidence),
    ].join('\n'),
  };
};

/** Triage request for one priority threat. `rank` is its 1-based position in the brief. */
export const buildThreatTriageRequest = (
  params: Parameters<typeof buildThreatTriageRequestRaw>[0]
): TriageRequest => resolveTriageRequest(buildThreatTriageRequestRaw(params), params.evidence);

/** Triage request for one recommended action. */
export const buildActionTriageRequest = (
  params: Parameters<typeof buildActionTriageRequestRaw>[0]
): TriageRequest => resolveTriageRequest(buildActionTriageRequestRaw(params), params.evidence);

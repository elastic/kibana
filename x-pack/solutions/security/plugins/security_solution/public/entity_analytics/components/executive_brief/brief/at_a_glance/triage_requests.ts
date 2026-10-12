/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Brief,
  BriefArea,
  BriefThreat,
} from '../../../../../../common/entity_analytics/executive_brief/brief';
import type {
  BriefEntity,
  EntityId,
  Evidence,
  Fact,
  Link,
} from '../../../../../../common/entity_analytics/executive_brief/evidence';
import { LINK_VERBS } from '../../../../../../common/entity_analytics/executive_brief/evidence';
import type { TriageRequest } from '../../actions/brief_actions_context';
import { AREA_LABELS, ATTENTION_LEVEL_LABELS, OWNER_LABELS, URGENCY_LABELS } from '../../constants';

/**
 * Triage prompts for the verdict and area rows. Pure and deterministic. The text is sent to the
 * Agent Builder as-is and stays English. Entity Store ids are never included: entities are named,
 * and evidence ids (F-n, L-n) appear only next to a description.
 */

/** Time window of the brief, added to the evidence so the agent queries the same period. */
export interface TriagePeriod {
  from: string;
  to: string;
  generatedAt?: string;
}

const MAX_EVIDENCE_LINES = 12;

const humanise = (value: string): string => value.replace(/_/g, ' ');

const capped = (lines: string[], max: number = MAX_EVIDENCE_LINES): string[] =>
  lines.length > max ? [...lines.slice(0, max), `- ... and ${lines.length - max} more`] : lines;

const entityName = (evidence: Evidence, id: string): string | undefined =>
  evidence.entities[id as EntityId]?.name;

const entityNames = (evidence: Evidence, ids: readonly string[]): string[] =>
  ids.flatMap((id) => {
    const name = entityName(evidence, id);
    return name ? [name] : [];
  });

const describeEntity = (entity: BriefEntity): string => {
  const traits = [
    entity.type,
    entity.criticality ? `criticality ${humanise(entity.criticality)}` : undefined,
    entity.privileged ? 'privileged' : undefined,
    entity.riskLevel ? `risk ${entity.riskLevel}` : undefined,
    entity.watchlists && entity.watchlists.length > 0
      ? `watchlists ${entity.watchlists.join(', ')}`
      : undefined,
  ].filter(Boolean);
  return `- ${entity.name} (${traits.join(', ')})`;
};

const describeFact = (fact: Fact, evidence: Evidence): string => {
  const numbers = Object.entries(fact.numbers ?? {}).map(
    ([key, value]) => `${humanise(key)} ${value}`
  );
  const details = Object.entries(fact.details ?? {}).map(
    ([key, value]) => `${humanise(key)}: ${value}`
  );
  const names = entityNames(evidence, fact.entities);
  const meta = [fact.id, fact.severity, fact.at].filter(Boolean).join('; ');
  return [
    `- ${fact.title} (${meta})`,
    [...numbers, ...details].length > 0 ? `: ${[...numbers, ...details].join(', ')}` : '',
    names.length > 0 ? `. Entities: ${names.join(', ')}` : '',
  ].join('');
};

const describeLink = (link: Link, evidence: Evidence): string | undefined => {
  const from = entityName(evidence, link.from);
  const to = entityName(evidence, link.to);
  return from && to ? `- ${from} ${LINK_VERBS[link.type]} ${to} (${link.id})` : undefined;
};

/** Markdown for the cited evidence ids: entities, facts and links, with entities named. */
export const buildCitedEvidenceLines = (ids: readonly string[], evidence: Evidence): string[] => {
  const cited = new Set(ids);
  const entities = Object.values(evidence.entities)
    .filter(({ id }) => cited.has(id))
    .map(describeEntity);
  const facts = evidence.facts
    .filter(({ id }) => cited.has(id))
    .map((fact) => describeFact(fact, evidence));
  const links = evidence.links
    .filter(({ id }) => cited.has(id))
    .flatMap((link) => {
      const line = describeLink(link, evidence);
      return line ? [line] : [];
    });
  return [
    ...(entities.length > 0 ? ['### Entities', ...capped(entities), ''] : []),
    ...(facts.length > 0 ? ['### Facts', ...capped(facts), ''] : []),
    ...(links.length > 0 ? ['### Links', ...capped(links), ''] : []),
  ];
};

const periodLines = (period?: TriagePeriod): string[] =>
  period
    ? [
        `Time range: ${period.from} to ${period.to}`,
        ...(period.generatedAt ? [`Brief generated at: ${period.generatedAt}`] : []),
      ]
    : [];

const threatLine = (threat: BriefThreat, index: number, evidence: Evidence): string =>
  `- Threat ${index + 1} "${threat.title}" (${threat.severity}; ${humanise(threat.status)}; ${
    threat.confidence
  } confidence). Entities: ${entityNames(evidence, threat.entities).join(', ') || 'none'}`;

const nextStepLine = ({ nextStep }: BriefThreat): string =>
  `${nextStep.action} (owner ${OWNER_LABELS[nextStep.owner]}; ${URGENCY_LABELS[
    nextStep.urgency
  ].toLowerCase()})`;

/** Triage request for the verdict: the overall assessment and the top threat's next step. */
export const buildVerdictTriageRequest = (
  brief: Brief,
  evidence: Evidence,
  period?: TriagePeriod
): TriageRequest => {
  const { verdict, threats } = brief;
  const [topThreat] = threats;
  return {
    instruction: [
      `Triage the overall assessment from the Entity Analytics executive brief: "${verdict.headline}". The evidence is attached below.`,
      'First, verify from the live data whether the assessment holds, and say what you checked.',
      topThreat
        ? 'Then work through the priority threats in order, recommend containment steps, and say whether a case should be opened and who should own it.'
        : 'Then say what, if anything, needs doing next and who should own it.',
    ].join('\n'),
    evidenceMarkdown: [
      `## ${ATTENTION_LEVEL_LABELS[verdict.level]}: ${verdict.headline}`,
      '',
      verdict.summary,
      '',
      ...(topThreat ? ['### Next step', `- ${nextStepLine(topThreat)}`, ''] : []),
      ...(threats.length > 0
        ? [
            '### Priority threats',
            ...threats.map((threat, index) => threatLine(threat, index, evidence)),
            '',
          ]
        : []),
      ...buildCitedEvidenceLines(verdict.evidence, evidence),
      ...periodLines(period),
    ].join('\n'),
  };
};

const threatsAreaRequest = (
  area: BriefArea,
  brief: Brief,
  evidence: Evidence,
  period?: TriagePeriod
): TriageRequest => ({
  instruction: [
    'Triage the threat activity from the Entity Analytics executive brief. The evidence is attached below.',
    'First, verify from the live data whether this is real compromise or benign activity, and say what you checked.',
    'Then check for related activity beyond the listed entities, recommend containment steps, and say whether a case should be opened and who should own it.',
  ].join('\n'),
  evidenceMarkdown: [
    `## ${AREA_LABELS.threats}: ${ATTENTION_LEVEL_LABELS[area.level]}`,
    '',
    area.summary,
    '',
    ...(brief.threats.length > 0
      ? [
          '### Priority threats',
          ...brief.threats.map((threat, index) => threatLine(threat, index, evidence)),
          '',
        ]
      : []),
    ...buildCitedEvidenceLines(area.evidence, evidence),
    ...periodLines(period),
  ].join('\n'),
});

const responseAreaRequest = (
  area: BriefArea,
  brief: Brief,
  evidence: Evidence,
  period?: TriagePeriod
): TriageRequest => ({
  instruction: [
    'Triage the response to the alerts in the Entity Analytics executive brief. The evidence is attached below.',
    'First, verify the current alert and case state in the live data.',
    'Then say which alerts need a case, how to group them (for example by priority threat or entity), and who should own each case.',
  ].join('\n'),
  evidenceMarkdown: [
    `## ${AREA_LABELS.response}: ${ATTENTION_LEVEL_LABELS[area.level]}`,
    '',
    area.summary,
    '',
    ...(brief.threats.length > 0
      ? [
          '### Response state of each priority threat',
          ...brief.threats.map(
            (threat, index) =>
              `- Threat ${index + 1} "${threat.title}" (${threat.severity}): ${humanise(
                threat.status
              )}`
          ),
          '',
        ]
      : []),
    ...buildCitedEvidenceLines(area.evidence, evidence),
    ...periodLines(period),
  ].join('\n'),
});

/** Triage request for an area row. */
export const buildAreaTriageRequest = (
  area: BriefArea,
  brief: Brief,
  evidence: Evidence,
  period?: TriagePeriod
): TriageRequest =>
  area.id === 'threats'
    ? threatsAreaRequest(area, brief, evidence, period)
    : responseAreaRequest(area, brief, evidence, period);

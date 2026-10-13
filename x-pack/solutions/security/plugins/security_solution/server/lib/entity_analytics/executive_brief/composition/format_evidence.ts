/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Entity } from '@kbn/entity-store/common';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import type {
  Evidence,
  Fact,
  Severity,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { entityDisplayName, entityTypeOf, watchlistsOf } from '../entity_record';
import { BRIEF_SIGNALS } from '../signals';
import type { SignalOutcome } from '../signals/types';
import { toMention } from '../verification/mentions';

/**
 * Renders evidence as compact text for the prompt. Generic over facts: a new signal shows up as a
 * new group under "Facts" with no changes here. Facts are listed by their numeric ids, which the
 * brief cites. Entities are identified by EUID,
 * which the model cites in prose; names are shown as they are (the platform's anonymisation
 * settings apply to every inference call). UUIDs in free text are noise and are removed.
 */

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type CleanText = (text: string) => string;

const cleanPart = (text: string): string =>
  text.replace(UUID_PATTERN, '[id]').replace(/"/g, "'").replace(/\s+/g, ' ');

/** Removes UUIDs and keeps text on one line without double quotes, leaving the EUIDs intact. */
export const createTextCleaner = (euids: readonly string[]): CleanText => {
  const kept = [...euids].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const euidPattern = kept.length > 0 ? new RegExp(`(${kept.join('|')})`) : undefined;
  return (text) =>
    // Splitting on a capturing group puts the EUIDs at the odd indexes.
    (euidPattern ? text.split(euidPattern) : [text])
      .map((part, index) => (index % 2 === 1 ? part : cleanPart(part)))
      .join('')
      .trim();
};

const formatTime = (iso: string): string => iso.replace(/:\d{2}(?:\.\d+)?Z$/, 'Z');

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);

const formatEntity = (euid: string, record: Entity, clean: CleanText): string => {
  const parts: string[] = [entityTypeOf(record, euid)];
  const risk = getEntityRisk(record);
  if (risk) {
    parts.push(`risk ${risk.level} (score ${formatNumber(risk.score)})`);
  }
  const criticality = record.asset?.criticality;
  if (criticality) {
    parts.push(`criticality ${criticality}`);
  }
  const { privileged, others } = watchlistsOf(record);
  if (privileged) {
    parts.push('privileged');
  }
  if (others.length > 0) {
    parts.push(`watchlists: ${others.map(clean).join(', ')}`);
  }
  return `${toMention(euid)} "${clean(entityDisplayName(record, euid))}" (${parts.join(' · ')})`;
};

const formatFact = (fact: Fact, clean: CleanText): string => {
  const head = [
    `${fact.id}.`,
    fact.severity ? `[${fact.severity}]` : undefined,
    fact.timestamp ? formatTime(fact.timestamp) : undefined,
    `"${clean(fact.title)}"`,
  ]
    .filter((part) => part !== undefined)
    .join(' ');
  const parts = [
    head,
    `entities: ${fact.entityIds.length > 0 ? fact.entityIds.join(', ') : 'none'}`,
  ];
  const numbers = Object.entries(fact.numbers ?? {});
  if (numbers.length > 0) {
    parts.push(
      `numbers: ${numbers.map(([key, value]) => `${key}=${formatNumber(value)}`).join(', ')}`
    );
  }
  Object.entries(fact.details ?? {}).forEach(([key, value]) => {
    parts.push(`${key}: ${clean(value)}`);
  });
  return parts.join(' · ');
};

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

const SIGNAL_TITLES: ReadonlyMap<string, string> = new Map(
  BRIEF_SIGNALS.map(({ id, title }) => [id, title])
);

const signalTitle = (signalId: string): string => SIGNAL_TITLES.get(signalId) ?? signalId;

const formatSignal = (signal: SignalOutcome, clean: CleanText): string => {
  const title = signalTitle(signal.id);
  const reason = signal.reason ? `: ${clean(signal.reason)}` : '';
  switch (signal.status) {
    case 'ok':
      return `- ${title}: checked, ${plural(signal.factCount, 'fact')}`;
    case 'empty':
      return `- ${title}: checked, nothing found`;
    case 'timeout':
      return `- ${title}: not checked (timed out${reason})`;
    default:
      return `- ${title}: not checked (${signal.status}${reason})`;
  }
};

const compareFacts = (a: Fact, b: Fact): number =>
  (a.severity ? SEVERITY_RANK[a.severity] : 4) - (b.severity ? SEVERITY_RANK[b.severity] : 4) ||
  (Date.parse(b.timestamp ?? '') || 0) - (Date.parse(a.timestamp ?? '') || 0) ||
  a.id - b.id;

/** Groups facts by the signal that found them; signals in run order, unknown signals after. */
const groupFacts = (
  evidence: Evidence,
  signals: readonly SignalOutcome[]
): Array<{ header: string; facts: Fact[] }> => {
  const order = new Set([
    ...signals.map(({ id }) => id),
    ...evidence.facts.map(({ signalId }) => signalId),
  ]);
  return [...order].flatMap((signalId) => {
    const facts = evidence.facts.filter((fact) => fact.signalId === signalId);
    return facts.length > 0
      ? [{ header: signalTitle(signalId), facts: [...facts].sort(compareFacts) }]
      : [];
  });
};

/**
 * Renders the evidence, and how each signal's run went, as the prompt's evidence block.
 * Deterministic for the same input.
 */
export const formatEvidence = (evidence: Evidence, signals: readonly SignalOutcome[]): string => {
  const entities = Object.entries(evidence.entities);
  const clean = createTextCleaner(entities.map(([euid]) => euid));
  const lines: string[] = [];

  lines.push(`## Entities (${entities.length})`);
  lines.push(
    ...(entities.length > 0
      ? entities.map(([euid, record]) => formatEntity(euid, record, clean))
      : ['None'])
  );

  lines.push('', `## Facts (${evidence.facts.length})`);
  const groups = groupFacts(evidence, signals);
  if (groups.length === 0) {
    lines.push('None found in this window.');
  }
  groups.forEach(({ header, facts }) => {
    lines.push('', `### ${header} (${facts.length})`, ...facts.map((f) => formatFact(f, clean)));
  });

  lines.push('', '## Signals');
  lines.push(
    ...(signals.length > 0 ? signals.map((signal) => formatSignal(signal, clean)) : ['None ran'])
  );
  return lines.join('\n');
};

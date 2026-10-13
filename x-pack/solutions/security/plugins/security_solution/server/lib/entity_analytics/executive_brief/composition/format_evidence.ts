/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, groupBy, uniq } from 'lodash';
import type { Entity } from '@kbn/entity-store/common';
import type {
  Fact,
  Severity,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import { entityDisplayName, entityTypeOf, watchlistsOf } from '../entity_record';
import { BRIEF_SIGNALS } from '../signals';
import type { Evidence, SignalOutcome } from '../signals/types';
import { alternationPattern } from '../verification/context';
import { toMention } from '../verification/mentions';

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

type CleanText = (text: string) => string;

/** Removes UUIDs and keeps text on one line without double quotes, leaving the EUIDs intact. */
const createTextCleaner = (euids: readonly string[]): CleanText => {
  const pattern = alternationPattern(euids);
  const euidPattern = pattern && new RegExp(`(${pattern.source})`);
  // Splitting on a capturing group puts the EUIDs at the odd indexes.
  return (text) =>
    (euidPattern ? text.split(euidPattern) : [text])
      .map((part, index) =>
        index % 2 === 1
          ? part
          : part.replace(UUID_PATTERN, '[id]').replace(/"/g, "'").replace(/\s+/g, ' ')
      )
      .join('')
      .trim();
};

const formatNumber = (value: number): string => String(Math.round(value * 10) / 10);

const signalTitle = (signalId: string): string =>
  BRIEF_SIGNALS.find(({ id }) => id === signalId)?.title ?? signalId;

const formatEntity = (euid: string, record: Entity, clean: CleanText): string => {
  const risk = getEntityRisk(record);
  const criticality = record.asset?.criticality;
  const { privileged, others } = watchlistsOf(record);
  const parts = compact([
    entityTypeOf(record, euid),
    risk && `risk ${risk.level} (score ${formatNumber(risk.score)})`,
    criticality && `criticality ${criticality}`,
    privileged && 'privileged',
    others.length > 0 && `watchlists: ${others.map(clean).join(', ')}`,
  ]);
  return `${toMention(euid)} "${clean(entityDisplayName(record, euid))}" (${parts.join(' · ')})`;
};

const formatFact = (fact: Fact, clean: CleanText): string => {
  const head = compact([
    `${fact.id}.`,
    fact.severity && `[${fact.severity}]`,
    fact.timestamp?.replace(/:\d{2}(?:\.\d+)?Z$/, 'Z'),
    `"${clean(fact.title)}"`,
  ]);
  const numbers = Object.entries(fact.numbers ?? {}).map(
    ([key, value]) => `${key}=${formatNumber(value)}`
  );
  return compact([
    head.join(' '),
    `entities: ${fact.entityIds.join(', ') || 'none'}`,
    numbers.length > 0 && `numbers: ${numbers.join(', ')}`,
    ...Object.entries(fact.details ?? {}).map(([key, value]) => `${key}: ${clean(value)}`),
  ]).join(' · ');
};

const formatSignal = (
  { id, status, reason, factCount }: SignalOutcome,
  clean: CleanText
): string => {
  if (status === 'ok' || status === 'empty') {
    const found =
      status === 'ok' ? `${factCount} fact${factCount === 1 ? '' : 's'}` : 'nothing found';
    return `- ${signalTitle(id)}: checked, ${found}`;
  }
  const why = reason ? `: ${clean(reason)}` : '';
  return `- ${signalTitle(id)}: not checked (${status === 'timeout' ? 'timed out' : status}${why})`;
};

const compareFacts = (a: Fact, b: Fact): number =>
  (a.severity ? SEVERITY_RANK[a.severity] : 4) - (b.severity ? SEVERITY_RANK[b.severity] : 4) ||
  (Date.parse(b.timestamp ?? '') || 0) - (Date.parse(a.timestamp ?? '') || 0) ||
  a.id - b.id;

/**
 * The prompt's evidence block: entities by mention token, facts by the ids the brief cites (grouped
 * by signal, in run order), and how each signal's run went. Deterministic for the same input.
 */
export const formatEvidence = (evidence: Evidence, signals: readonly SignalOutcome[]): string => {
  const entities = Object.entries(evidence.entities);
  const clean = createTextCleaner(entities.map(([euid]) => euid));
  const bySignal = groupBy(evidence.facts, 'signalId');
  const factLines = uniq([...signals.map(({ id }) => id), ...Object.keys(bySignal)]).flatMap(
    (signalId) => {
      const facts = [...(bySignal[signalId] ?? [])].sort(compareFacts);
      return facts.length > 0
        ? [
            '',
            `### ${signalTitle(signalId)} (${facts.length})`,
            ...facts.map((fact) => formatFact(fact, clean)),
          ]
        : [];
    }
  );
  return [
    `## Entities (${entities.length})`,
    ...(entities.length > 0
      ? entities.map(([euid, record]) => formatEntity(euid, record, clean))
      : ['None']),
    '',
    `## Facts (${evidence.facts.length})`,
    ...(factLines.length > 0 ? factLines : ['None found in this window.']),
    '',
    '## Signals',
    ...(signals.length > 0 ? signals.map((signal) => formatSignal(signal, clean)) : ['None ran']),
  ].join('\n');
};

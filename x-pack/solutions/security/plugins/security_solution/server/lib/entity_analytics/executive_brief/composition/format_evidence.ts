/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, groupBy, orderBy, uniq } from 'lodash';
import type { Entity } from '@kbn/entity-store/common';
import type {
  Fact,
  Severity,
} from '../../../../../common/api/entity_analytics/executive_brief/common.gen';
import { getEntityRisk } from '../../../../../common/entity_analytics/executive_brief/entity_risk';
import { entityDisplayName, entityTypeOf, watchlistsOf } from '../signals/engine/entity_record';
import { BRIEF_SIGNALS } from '../signals';
import type { Evidence, SignalOutcome } from '../signals';
import { alternationPattern } from '../verification/verify';
import { toMention } from '../verification/mentions';

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

type CleanText = (text: string) => string;

const cleanPart = (part: string): string =>
  part.replace(UUID_PATTERN, '[id]').replace(/"/g, "'").replace(/\s+/g, ' ');

/** Removes UUIDs and keeps text on one line without double quotes, leaving the EUIDs intact. */
const createTextCleaner = (euids: readonly string[]): CleanText => {
  const pattern = alternationPattern(euids);
  if (!pattern) {
    return (text) => cleanPart(text).trim();
  }
  // Splitting on a capturing group puts the EUIDs at the odd indexes.
  const euidPattern = new RegExp(`(${pattern.source})`);
  const cleanUnlessEuid = (part: string, index: number) =>
    index % 2 === 1 ? part : cleanPart(part);
  return (text) => text.split(euidPattern).map(cleanUnlessEuid).join('').trim();
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
  const title = signalTitle(id);
  if (status === 'ok') {
    return `- ${title}: checked, ${factCount} fact${factCount === 1 ? '' : 's'}`;
  }
  if (status === 'empty') {
    return `- ${title}: checked, nothing found`;
  }
  const label = status === 'timeout' ? 'timed out' : status;
  const why = reason ? `: ${clean(reason)}` : '';
  return `- ${title}: not checked (${label}${why})`;
};

const severityRank = ({ severity }: Fact): number => (severity ? SEVERITY_RANK[severity] : 4);
const timeOf = ({ timestamp }: Fact): number => Date.parse(timestamp ?? '') || 0;

/** Most severe first, then newest first, then by id. */
const sortFacts = (facts: Fact[]): Fact[] =>
  orderBy(facts, [severityRank, timeOf, 'id'], ['asc', 'desc', 'asc']);

/** `lines`, or a single `fallback` line when there are none. */
const orElse = (lines: string[], fallback: string): string[] =>
  lines.length > 0 ? lines : [fallback];

/** The prompt's evidence block: entities, facts grouped by signal in run order, and each signal's run. */
export const formatEvidence = (evidence: Evidence): string => {
  const { signals } = evidence;
  const entities = Object.entries(evidence.entities);
  const clean = createTextCleaner(entities.map(([euid]) => euid));
  const bySignal = groupBy(evidence.facts, 'signalId');
  const signalIds = uniq([...signals.map(({ id }) => id), ...Object.keys(bySignal)]);
  const factLines = signalIds.flatMap((signalId) => {
    const facts = sortFacts(bySignal[signalId] ?? []);
    if (facts.length === 0) {
      return [];
    }
    const header = `### ${signalTitle(signalId)} (${facts.length})`;
    return ['', header, ...facts.map((fact) => formatFact(fact, clean))];
  });
  return [
    `## Entities (${entities.length})`,
    ...orElse(
      entities.map(([euid, record]) => formatEntity(euid, record, clean)),
      'None'
    ),
    '',
    `## Facts (${evidence.facts.length})`,
    ...orElse(factLines, 'None found in this window.'),
    '',
    '## Signals',
    ...orElse(
      signals.map((signal) => formatSignal(signal, clean)),
      'None ran'
    ),
  ].join('\n');
};

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
  Link,
  Severity,
  SignalRun,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { LINK_VERBS } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { entityDisplayName, entityTypeOf, watchlistsOf } from '../entity_record';
import { toMention } from '../verification/mentions';

/**
 * Renders evidence as compact text for the prompt. Generic over facts and links: a new signal or
 * fact kind shows up as a new section with no changes here. Entities are identified by EUID,
 * which the model cites in prose; names are shown as they are (the platform's anonymisation
 * settings apply to every inference call). UUIDs in free text are noise and are removed.
 */

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const idNumber = (id: string): number => Number(id.slice(id.indexOf('-') + 1));

const byIdNumber = (a: string, b: string): number => idNumber(a) - idNumber(b);

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
    fact.id,
    fact.severity ? `[${fact.severity}]` : undefined,
    fact.at ? formatTime(fact.at) : undefined,
    `"${clean(fact.title)}"`,
  ]
    .filter((part) => part !== undefined)
    .join(' ');
  const parts = [head, `entities: ${fact.entities.length > 0 ? fact.entities.join(', ') : 'none'}`];
  const numbers = Object.entries(fact.numbers ?? {});
  if (numbers.length > 0) {
    parts.push(
      `numbers: ${numbers.map(([key, value]) => `${key}=${formatNumber(value)}`).join(', ')}`
    );
  }
  Object.entries(fact.details ?? {}).forEach(([key, value]) => {
    parts.push(`${key}: ${clean(value)}`);
  });
  return parts.join(' | ');
};

const formatLink = (link: Link): string => {
  const parts = [`${link.id} ${link.from} → ${link.to}: "${LINK_VERBS[link.type]}" (${link.type})`];
  if (link.factIds.length > 0) {
    parts.push(`backed by: ${link.factIds.join(', ')}`);
  }
  if (link.firstSeen) {
    parts.push(`first seen: ${formatTime(link.firstSeen)}`);
  }
  return parts.join(' | ');
};

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

const formatSignal = (signal: SignalRun, clean: CleanText): string => {
  const reason = signal.reason ? `: ${clean(signal.reason)}` : '';
  switch (signal.status) {
    case 'ok':
      return `- ${signal.title}: checked, ${plural(signal.factCount, 'fact')}, ${plural(
        signal.linkCount,
        'link'
      )}`;
    case 'empty':
      return `- ${signal.title}: checked, nothing found`;
    case 'timeout':
      return `- ${signal.title}: not checked (timed out${reason})`;
    default:
      return `- ${signal.title}: not checked (${signal.status}${reason})`;
  }
};

const compareFacts = (a: Fact, b: Fact): number =>
  (a.severity ? SEVERITY_RANK[a.severity] : 4) - (b.severity ? SEVERITY_RANK[b.severity] : 4) ||
  (Date.parse(b.at ?? '') || 0) - (Date.parse(a.at ?? '') || 0) ||
  byIdNumber(a.id, b.id);

/** Groups facts by signal, then kind; signals in run order, unknown signals after. */
const groupFacts = (evidence: Evidence): Array<{ header: string; facts: Fact[] }> => {
  const titles = new Map(evidence.signals.map(({ id, title }) => [id, title]));
  const order = [...evidence.signals.map(({ id }) => id)];
  const groups = new Map<string, { header: string; facts: Fact[] }>();
  evidence.facts.forEach((fact) => {
    if (!order.includes(fact.signalId)) {
      order.push(fact.signalId);
    }
  });
  order.forEach((signalId) => {
    evidence.facts
      .filter((fact) => fact.signalId === signalId)
      .forEach((fact) => {
        const key = `${signalId}\u0000${fact.kind}`;
        const group = groups.get(key) ?? {
          header: `${titles.get(signalId) ?? signalId} — ${fact.kind}`,
          facts: [],
        };
        group.facts.push(fact);
        groups.set(key, group);
      });
  });
  return [...groups.values()].map((group) => ({
    ...group,
    facts: [...group.facts].sort(compareFacts),
  }));
};

/** Renders the evidence as the prompt's evidence block. Deterministic for the same evidence. */
export const formatEvidence = (evidence: Evidence): string => {
  const entities = Object.entries(evidence.entities);
  const clean = createTextCleaner(entities.map(([euid]) => euid));
  const lines: string[] = [];

  lines.push(`## Entities (${entities.length})`);
  lines.push(
    ...(entities.length > 0
      ? entities.map(([euid, record]) => formatEntity(euid, record, clean))
      : ['None'])
  );

  const groups = groupFacts(evidence);
  if (groups.length === 0) {
    lines.push('', '## Facts (0)', 'None found in this window.');
  }
  groups.forEach(({ header, facts }) => {
    lines.push('', `## ${header} (${facts.length})`, ...facts.map((f) => formatFact(f, clean)));
  });

  const links = [...evidence.links].sort((a, b) => byIdNumber(a.id, b.id));
  lines.push('', `## Links (${links.length})`);
  lines.push(...(links.length > 0 ? links.map(formatLink) : ['None']));

  lines.push('', '## Signals');
  lines.push(
    ...(evidence.signals.length > 0
      ? evidence.signals.map((signal) => formatSignal(signal, clean))
      : ['None ran'])
  );
  return lines.join('\n');
};

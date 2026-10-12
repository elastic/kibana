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
  Severity,
  SignalRun,
} from '../../../../../common/entity_analytics/executive_brief/evidence';
import { LINK_VERBS } from '../../../../../common/entity_analytics/executive_brief/evidence';

/**
 * Renders evidence as compact text for the prompt. Generic over facts and links: a new signal or
 * fact kind shows up as a new section with no changes here. Entities appear by ENT id only; their
 * names (and euids) are replaced by ENT ids wherever signal text mentions them, and UUIDs are
 * removed, so the only identifiers the model sees are evidence ids.
 */

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const MIN_REDACTED_LENGTH = 3;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const idNumber = (id: string): number => Number(id.slice(id.indexOf('-') + 1));

const byIdNumber = (a: string, b: string): number => idNumber(a) - idNumber(b);

/** Replaces entity names and euids with ENT ids, removes UUIDs, and keeps text on one line. */
export const createRedactor = (entities: readonly BriefEntity[]): ((text: string) => string) => {
  const replacements = new Map<string, string>();
  entities.forEach(({ id, name, euid }) => {
    [name, euid].forEach((surface) => {
      if (surface && surface.length >= MIN_REDACTED_LENGTH) {
        replacements.set(surface.toLowerCase(), id);
      }
    });
  });
  const surfaces = [...replacements.keys()].sort((a, b) => b.length - a.length);
  const pattern =
    surfaces.length > 0
      ? new RegExp(
          `(?<![\\w.@-])(?:${surfaces.map(escapeRegExp).join('|')})(?![\\w@-]|\\.\\w)`,
          'gi'
        )
      : undefined;
  return (text) => {
    const redacted = pattern
      ? text.replace(pattern, (match) => replacements.get(match.toLowerCase()) ?? match)
      : text;
    return redacted.replace(UUID_PATTERN, '[id]').replace(/"/g, "'").replace(/\s+/g, ' ').trim();
  };
};

const formatTime = (iso: string): string => iso.replace(/:\d{2}(?:\.\d+)?Z$/, 'Z');

const formatNumber = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);

const formatEntity = (entity: BriefEntity, redact: (text: string) => string): string => {
  const parts = [`${entity.id} ${entity.type}`];
  if (entity.riskLevel || entity.riskScore !== undefined) {
    const score =
      entity.riskScore === undefined ? '' : ` (score ${formatNumber(entity.riskScore)})`;
    parts.push(`risk ${entity.riskLevel ?? 'unknown'}${score}`);
  }
  if (entity.criticality) {
    parts.push(`criticality ${entity.criticality}`);
  }
  if (entity.privileged) {
    parts.push('privileged');
  }
  if (entity.watchlists && entity.watchlists.length > 0) {
    parts.push(`watchlists: ${entity.watchlists.map(redact).join(', ')}`);
  }
  if (entity.aliasCount) {
    parts.push(`${entity.aliasCount} resolved aliases`);
  }
  return parts.join(' · ');
};

const formatFact = (fact: Fact, redact: (text: string) => string): string => {
  const head = [
    fact.id,
    fact.severity ? `[${fact.severity}]` : undefined,
    fact.at ? formatTime(fact.at) : undefined,
    `"${redact(fact.title)}"`,
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
    parts.push(`${key}: ${redact(value)}`);
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

const formatSignal = (signal: SignalRun, redact: (text: string) => string): string => {
  const reason = signal.reason ? `: ${redact(signal.reason)}` : '';
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
  const entities = Object.values(evidence.entities).sort((a, b) => byIdNumber(a.id, b.id));
  const redact = createRedactor(entities);
  const lines: string[] = [];

  lines.push(`## Entities (${entities.length})`);
  lines.push(...(entities.length > 0 ? entities.map((e) => formatEntity(e, redact)) : ['None']));

  const groups = groupFacts(evidence);
  if (groups.length === 0) {
    lines.push('', '## Facts (0)', 'None found in this window.');
  }
  groups.forEach(({ header, facts }) => {
    lines.push('', `## ${header} (${facts.length})`, ...facts.map((f) => formatFact(f, redact)));
  });

  const links = [...evidence.links].sort((a, b) => byIdNumber(a.id, b.id));
  lines.push('', `## Links (${links.length})`);
  lines.push(...(links.length > 0 ? links.map(formatLink) : ['None']));

  lines.push('', '## Signals');
  lines.push(
    ...(evidence.signals.length > 0
      ? evidence.signals.map((signal) => formatSignal(signal, redact))
      : ['None ran'])
  );
  return lines.join('\n');
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AI-directed artifact contract for the AI Hunt result.
 *
 * The hunting agent emits typed *directives* naming which rich visual to render
 * (an entity card, alert table, risk gauge, MITRE strip, attack path, sankey,
 * or metric row) and *which real entities/fields to ground it in*. The model
 * never supplies the numbers — it only points at grounding keys. The
 * {@link groundHuntDirectives} step resolves each directive against the real
 * ES rows the hunt already collected (the `evidence` artifacts) and drops any
 * directive it cannot ground, so a fabricated value can never reach the UI.
 *
 * Directives are parsed tolerantly from the model's `structured_output` (an
 * `artifacts` array) or from a fenced ```hunt-artifacts JSON block in the
 * narrative. Partial / malformed / streaming payloads skip the bad directive
 * and keep the rest.
 */

import type { HuntSeverity } from './hunt_result_presentation';
import type { EvidenceHuntArtifact, HuntArtifact } from './hunt_artifacts';

export const HUNT_DIRECTIVE_TYPES = [
  'entity_card',
  'alert_table',
  'risk_gauge',
  'mitre_strip',
  'attack_path',
  'sankey',
  'metric_row',
] as const;

export type HuntDirectiveType = (typeof HUNT_DIRECTIVE_TYPES)[number];

/**
 * The raw directive shape the model emits. Everything except `type` is
 * optional/loose so a partial directive still parses; grounding decides whether
 * there is enough real data to render.
 */
export interface HuntArtifactDirective {
  type: HuntDirectiveType;
  /** Optional analyst-facing title; a sensible default is derived if omitted. */
  title?: string;
  /** Entity the artifact is about (entity_card / risk_gauge / attack_path). */
  entity?: string;
  /** Field the directive groups/flows by (sankey source, metric field, etc). */
  field?: string;
  /** Secondary field (sankey target). */
  toField?: string;
  /** Free-form grounding hints (e.g. which query/tool produced the data). */
  note?: string;
}

// ---------------------------------------------------------------------------
// Grounded (resolved) artifact shapes — what the renderer consumes. Every
// numeric value here originates from a real ES row.
// ---------------------------------------------------------------------------

export interface GroundedEntityCard {
  type: 'entity_card';
  title: string;
  name: string;
  entityType?: string;
  riskLevel?: string;
  riskScore?: number;
  criticality?: string;
  alertCount?: number;
  lastSeen?: string;
}

export interface GroundedAlertRow {
  rule: string;
  severity?: HuntSeverity;
  timestamp?: string;
  entity?: string;
}

export interface GroundedAlertTable {
  type: 'alert_table';
  title: string;
  rows: GroundedAlertRow[];
}

export interface GroundedRiskGauge {
  type: 'risk_gauge';
  title: string;
  name: string;
  score: number;
  level?: string;
}

export interface GroundedMitreStrip {
  type: 'mitre_strip';
  title: string;
  techniques: Array<{ id?: string; name: string; count: number }>;
}

export interface GroundedAttackPathStep {
  label: string;
  detail?: string;
  severity?: HuntSeverity;
}

export interface GroundedAttackPath {
  type: 'attack_path';
  title: string;
  steps: GroundedAttackPathStep[];
}

export interface GroundedSankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface GroundedSankey {
  type: 'sankey';
  title: string;
  links: GroundedSankeyLink[];
}

export interface GroundedMetric {
  label: string;
  value: string;
}

export interface GroundedMetricRow {
  type: 'metric_row';
  title: string;
  metrics: GroundedMetric[];
}

export type GroundedArtifactData =
  | GroundedEntityCard
  | GroundedAlertTable
  | GroundedRiskGauge
  | GroundedMitreStrip
  | GroundedAttackPath
  | GroundedSankey
  | GroundedMetricRow;

/**
 * A grounded artifact ready to render, tagged as a HuntArtifact so it flows
 * through the existing artifact array (and is persisted for reopen with no LLM
 * call). `provenance` is a short, analyst-facing "where this came from" line.
 */
export interface DirectiveHuntArtifact {
  id: string;
  type: 'directive';
  directiveType: HuntDirectiveType;
  data: GroundedArtifactData;
  provenance: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const isDirectiveType = (value: unknown): value is HuntDirectiveType =>
  typeof value === 'string' && (HUNT_DIRECTIVE_TYPES as readonly string[]).includes(value);

// ---------------------------------------------------------------------------
// Parsing (tolerant): directives from structured_output or a fenced block.
// ---------------------------------------------------------------------------

const toDirective = (value: unknown): HuntArtifactDirective | undefined => {
  if (!isRecord(value) || !isDirectiveType(value.type)) return undefined;
  return {
    type: value.type,
    title: asString(value.title),
    entity: asString(value.entity),
    field: asString(value.field),
    toField: asString(value.toField ?? value.to_field),
    note: asString(value.note),
  };
};

/** Extracts directives from a model `structured_output` object. */
export const parseDirectivesFromStructuredOutput = (output: unknown): HuntArtifactDirective[] => {
  if (!isRecord(output)) return [];
  const list = output.artifacts ?? output.directives;
  if (!Array.isArray(list)) return [];
  return list.flatMap((candidate) => {
    const directive = toDirective(candidate);
    return directive ? [directive] : [];
  });
};

const FENCE_PATTERN = /```(?:hunt-artifacts|hunt_artifacts|json)?\s*([\s\S]*?)```/gi;

/**
 * Extracts directives from a fenced ```hunt-artifacts JSON block embedded in
 * the narrative. Tolerant: a malformed block is skipped, the narrative is left
 * intact for the caller to strip.
 */
const directivesFromFenceBody = (body: string | undefined): HuntArtifactDirective[] => {
  const trimmed = body?.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.artifacts)
    ? parsed.artifacts
    : [];
  return list.flatMap((candidate) => {
    const directive = toDirective(candidate);
    return directive ? [directive] : [];
  });
};

export const parseDirectivesFromText = (text: string): HuntArtifactDirective[] => {
  if (typeof text !== 'string' || text.indexOf('```') === -1) return [];
  const directives: HuntArtifactDirective[] = [];
  let match: RegExpExecArray | null;
  FENCE_PATTERN.lastIndex = 0;
  while ((match = FENCE_PATTERN.exec(text)) !== null) {
    directives.push(...directivesFromFenceBody(match[1]));
  }
  return directives;
};

/** Removes any fenced hunt-artifacts blocks so the narrative renders cleanly. */
export const stripDirectiveBlocks = (text: string): string => {
  if (typeof text !== 'string' || text.indexOf('```') === -1) return text;
  return text.replace(FENCE_PATTERN, (full, body: string) => {
    // Only strip blocks that actually parsed as artifacts; leave real code.
    try {
      const parsed = JSON.parse((body ?? '').trim());
      const list = Array.isArray(parsed) ? parsed : isRecord(parsed) ? parsed.artifacts : undefined;
      if (Array.isArray(list) && list.some((c) => isRecord(c) && isDirectiveType(c.type))) {
        return '';
      }
    } catch {
      return full;
    }
    return full;
  });
};

// ---------------------------------------------------------------------------
// Grounding: resolve each directive against REAL ES rows/artifacts. Any
// directive that cannot be grounded in real data is dropped (never faked).
// ---------------------------------------------------------------------------

const SEVERITY_VALUES: readonly HuntSeverity[] = ['low', 'medium', 'high', 'critical'];

const toSeverity = (value: unknown): HuntSeverity | undefined => {
  const candidate = typeof value === 'string' ? value.toLowerCase() : undefined;
  if (candidate === 'moderate') return 'medium';
  return SEVERITY_VALUES.includes(candidate as HuntSeverity)
    ? (candidate as HuntSeverity)
    : undefined;
};

const rowValue = (row: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const raw = row[key];
    const candidate = Array.isArray(raw) ? raw.find((v) => v != null) : raw;
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate;
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
  }
};

const rowNumber = (row: Record<string, unknown>, keys: string[]): number | undefined => {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
      return Number(raw);
    }
  }
};

/** All ES rows the hunt actually collected (real evidence, deduped by source). */
const collectRows = (artifacts: HuntArtifact[]): Array<Record<string, unknown>> =>
  artifacts
    .filter((a): a is EvidenceHuntArtifact => a.type === 'evidence')
    .flatMap((a) => (Array.isArray(a.rows) ? a.rows : []))
    .filter((row): row is Record<string, unknown> => isRecord(row));

const USER_KEYS = ['user.name', 'user.id', 'source.user.name'];
const HOST_KEYS = ['host.name', 'host.id'];
const SERVICE_KEYS = ['service.name'];
const ENTITY_KEYS = ['entity.name', ...USER_KEYS, ...HOST_KEYS, ...SERVICE_KEYS];
const RULE_KEYS = ['kibana.alert.rule.name', 'rule.name'];
const SEVERITY_KEYS = ['kibana.alert.severity', 'event.severity_label', 'severity'];
const TIMESTAMP_KEYS = ['@timestamp', 'kibana.alert.start', 'event.created'];
const TECHNIQUE_ID_KEYS = [
  'kibana.alert.rule.threat.technique.id',
  'threat.technique.id',
  'technique.id',
];
const TECHNIQUE_NAME_KEYS = [
  'kibana.alert.rule.threat.technique.name',
  'threat.technique.name',
  'technique.name',
  'threat.tactic.name',
];

const rowMatchesEntity = (row: Record<string, unknown>, entity: string): boolean => {
  const target = entity.toLowerCase();
  return ENTITY_KEYS.some((key) => rowValue(row, [key])?.toLowerCase() === target);
};

const groundEntityCard = (
  directive: HuntArtifactDirective,
  rows: Array<Record<string, unknown>>,
  artifacts: HuntArtifact[]
): GroundedEntityCard | undefined => {
  const name = directive.entity;
  if (!name) return undefined;

  // Prefer a resolved entity artifact (entity store enrichment) for this name.
  const entityArtifact = artifacts.find(
    (a) => a.type === 'entity' && a.entity.name.toLowerCase() === name.toLowerCase()
  );
  const matchedRows = rows.filter((row) => rowMatchesEntity(row, name));
  const alertRows = matchedRows.filter((row) => rowValue(row, RULE_KEYS) !== undefined);

  if (!entityArtifact && matchedRows.length === 0) return undefined;

  const entity = entityArtifact?.type === 'entity' ? entityArtifact.entity : undefined;
  const alertCountFromArtifact =
    entityArtifact?.type === 'entity' ? entityArtifact.alertCount : undefined;
  return {
    type: 'entity_card',
    title: directive.title ?? name,
    name,
    entityType: entity?.type,
    riskLevel: entity?.riskLevel && entity.riskLevel !== 'Unknown' ? entity.riskLevel : undefined,
    riskScore: entity?.riskScoreNorm,
    criticality: entity?.criticality,
    alertCount: alertCountFromArtifact ?? (alertRows.length > 0 ? alertRows.length : undefined),
    lastSeen: entity?.lastSeen ?? rowValue(matchedRows[0] ?? {}, TIMESTAMP_KEYS),
  };
};

const groundAlertTable = (
  directive: HuntArtifactDirective,
  rows: Array<Record<string, unknown>>
): GroundedAlertTable | undefined => {
  const scoped = directive.entity
    ? rows.filter((row) => rowMatchesEntity(row, directive.entity as string))
    : rows;
  const alertRows: GroundedAlertRow[] = [];
  const seen = new Set<string>();
  scoped.forEach((row) => {
    if (alertRows.length >= 25) return;
    const rule = rowValue(row, RULE_KEYS);
    if (!rule) return;
    const timestamp = rowValue(row, TIMESTAMP_KEYS);
    const entity = rowValue(row, [...USER_KEYS, ...HOST_KEYS, ...SERVICE_KEYS]);
    const dedupeKey = `${rule}|${timestamp ?? ''}|${entity ?? ''}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    alertRows.push({ rule, severity: toSeverity(rowValue(row, SEVERITY_KEYS)), timestamp, entity });
  });
  if (alertRows.length === 0) return undefined;
  return {
    type: 'alert_table',
    title: directive.title ?? 'Related alerts',
    rows: alertRows,
  };
};

const RISK_LEVEL_TO_SCORE: Record<string, number> = {
  Critical: 90,
  High: 75,
  Moderate: 50,
  Low: 25,
};

const groundRiskGauge = (
  directive: HuntArtifactDirective,
  artifacts: HuntArtifact[]
): GroundedRiskGauge | undefined => {
  const name = directive.entity;
  if (!name) return undefined;
  const entityArtifact = artifacts.find(
    (a) => a.type === 'entity' && a.entity.name.toLowerCase() === name.toLowerCase()
  );
  if (entityArtifact?.type !== 'entity') return undefined;
  const { entity } = entityArtifact;
  const score =
    entity.riskScoreNorm ?? (entity.riskLevel ? RISK_LEVEL_TO_SCORE[entity.riskLevel] : undefined);
  if (score === undefined) return undefined;
  return {
    type: 'risk_gauge',
    title: directive.title ?? `${name} risk`,
    name,
    score: Math.round(score),
    level: entity.riskLevel !== 'Unknown' ? entity.riskLevel : undefined,
  };
};

const groundMitreStrip = (
  directive: HuntArtifactDirective,
  rows: Array<Record<string, unknown>>
): GroundedMitreStrip | undefined => {
  const counts = new Map<string, { id?: string; name: string; count: number }>();
  rows.forEach((row) => {
    const name = rowValue(row, TECHNIQUE_NAME_KEYS);
    const id = rowValue(row, TECHNIQUE_ID_KEYS);
    const key = name ?? id;
    if (!key) return;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { id, name: name ?? (id as string), count: 1 });
    }
  });
  const techniques = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  if (techniques.length === 0) return undefined;
  return {
    type: 'mitre_strip',
    title: directive.title ?? 'Observed ATT&CK techniques',
    techniques,
  };
};

const groundSankey = (
  directive: HuntArtifactDirective,
  rows: Array<Record<string, unknown>>
): GroundedSankey | undefined => {
  const sourceKeys = directive.field ? [directive.field] : ['source.ip', ...USER_KEYS];
  const targetKeys = directive.toField
    ? [directive.toField]
    : ['destination.ip', 'destination.domain', ...HOST_KEYS];
  const counts = new Map<string, GroundedSankeyLink>();
  rows.forEach((row) => {
    const source = rowValue(row, sourceKeys);
    const target = rowValue(row, targetKeys);
    if (!source || !target || source === target) return;
    const key = `${source}→${target}`;
    const existing = counts.get(key);
    if (existing) existing.value += 1;
    else counts.set(key, { source, target, value: 1 });
  });
  const links = [...counts.values()].sort((a, b) => b.value - a.value).slice(0, 12);
  if (links.length === 0) return undefined;
  return { type: 'sankey', title: directive.title ?? 'Observed flows', links };
};

const groundAttackPath = (
  directive: HuntArtifactDirective,
  rows: Array<Record<string, unknown>>
): GroundedAttackPath | undefined => {
  const scoped = directive.entity
    ? rows.filter((row) => rowMatchesEntity(row, directive.entity as string))
    : rows;
  const withTime = scoped
    .map((row) => ({
      row,
      time: Date.parse(rowValue(row, TIMESTAMP_KEYS) ?? ''),
    }))
    .filter((entry) => !Number.isNaN(entry.time))
    .sort((a, b) => a.time - b.time);
  const steps: GroundedAttackPathStep[] = [];
  const seen = new Set<string>();
  withTime.forEach(({ row }) => {
    if (steps.length >= 6) return;
    const label =
      rowValue(row, RULE_KEYS) ??
      rowValue(row, ['event.action', 'process.name', 'threat.technique.name']);
    if (!label || seen.has(label)) return;
    seen.add(label);
    steps.push({
      label,
      detail: rowValue(row, [...HOST_KEYS, ...USER_KEYS, 'destination.ip']),
      severity: toSeverity(rowValue(row, SEVERITY_KEYS)),
    });
  });
  if (steps.length < 2) return undefined;
  return { type: 'attack_path', title: directive.title ?? 'Observed activity chain', steps };
};

const groundMetricRow = (
  directive: HuntArtifactDirective,
  rows: Array<Record<string, unknown>>,
  artifacts: HuntArtifact[]
): GroundedMetricRow | undefined => {
  const users = new Set<string>();
  const hosts = new Set<string>();
  const rules = new Set<string>();
  let alertRows = 0;
  for (const row of rows) {
    const user = rowValue(row, USER_KEYS);
    if (user) users.add(user);
    const host = rowValue(row, HOST_KEYS);
    if (host) hosts.add(host);
    const rule = rowValue(row, RULE_KEYS);
    if (rule) {
      rules.add(rule);
      alertRows += rowNumber(row, ['alert_count', 'count', 'doc_count']) ?? 1;
    }
  }
  const metrics: GroundedMetric[] = [];
  if (alertRows > 0) metrics.push({ label: 'Alerts', value: String(alertRows) });
  if (users.size > 0) metrics.push({ label: 'Users', value: String(users.size) });
  if (hosts.size > 0) metrics.push({ label: 'Hosts', value: String(hosts.size) });
  if (rules.size > 0) metrics.push({ label: 'Rules', value: String(rules.size) });
  const entityCount = artifacts.filter((a) => a.type === 'entity').length;
  if (entityCount > 0 && users.size === 0 && hosts.size === 0) {
    metrics.push({ label: 'Entities', value: String(entityCount) });
  }
  if (metrics.length === 0) return undefined;
  return {
    type: 'metric_row',
    title: directive.title ?? 'At a glance',
    metrics: metrics.slice(0, 4),
  };
};

const PROVENANCE = 'Grounded in this hunt’s query results';

/**
 * Resolves parsed directives into grounded artifacts using ONLY the real ES
 * rows/artifacts the hunt collected. Ungroundable directives are dropped.
 * Deterministic and pure so it can be unit-tested and re-run on reopen from the
 * saved payload (no LLM call).
 */
export const groundHuntDirectives = (
  directives: HuntArtifactDirective[],
  artifacts: HuntArtifact[]
): DirectiveHuntArtifact[] => {
  const rows = collectRows(artifacts);
  const result: DirectiveHuntArtifact[] = [];
  directives.forEach((directive, index) => {
    let data: GroundedArtifactData | undefined;
    switch (directive.type) {
      case 'entity_card':
        data = groundEntityCard(directive, rows, artifacts);
        break;
      case 'alert_table':
        data = groundAlertTable(directive, rows);
        break;
      case 'risk_gauge':
        data = groundRiskGauge(directive, artifacts);
        break;
      case 'mitre_strip':
        data = groundMitreStrip(directive, rows);
        break;
      case 'attack_path':
        data = groundAttackPath(directive, rows);
        break;
      case 'sankey':
        data = groundSankey(directive, rows);
        break;
      case 'metric_row':
        data = groundMetricRow(directive, rows, artifacts);
        break;
      default:
        data = undefined;
    }
    if (!data) return;
    result.push({
      id: `directive:${index}:${directive.type}:${directive.entity ?? directive.field ?? ''}`,
      type: 'directive',
      directiveType: directive.type,
      data,
      provenance: PROVENANCE,
    });
  });
  return result;
};

/**
 * Convenience: parse directives from a structured_output object plus the
 * narrative text, then ground them against the collected artifacts. Returns the
 * grounded directive artifacts ready to merge into the artifact array.
 */
export const buildGroundedDirectiveArtifacts = ({
  structuredOutput,
  narrative,
  artifacts,
}: {
  structuredOutput?: unknown;
  narrative?: string;
  artifacts: HuntArtifact[];
}): DirectiveHuntArtifact[] => {
  const directives = [
    ...parseDirectivesFromStructuredOutput(structuredOutput),
    ...(narrative ? parseDirectivesFromText(narrative) : []),
  ];
  if (directives.length === 0) return [];
  return groundHuntDirectives(directives, artifacts);
};

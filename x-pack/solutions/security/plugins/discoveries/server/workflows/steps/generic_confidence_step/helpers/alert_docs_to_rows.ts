/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedAlertFields } from '@kbn/discoveries/impl/confidence';

/**
 * The ECS / alerts-as-data fields the deterministic confidence factors read.
 * Everything else in an alert document is ignored for scoring. MITRE tactic /
 * technique ids are handled separately (see `collectThreatMitre`) because they
 * arrive in many shapes.
 */
const SCORED_FIELDS: readonly string[] = [
  'event.category',
  'event.dataset',
  'process.code_signature.trusted',
  'kibana.alert.severity',
  'kibana.alert.workflow_status',
  // Entity identity (cohesion), strongest identifiers first.
  'host.id',
  'host.name',
  'user.id',
  'user.name',
  'aws.cloudtrail.user_identity.arn',
  'azure.auditlogs.properties.initiated_by.user.user_principal_name',
  'gcp.audit.authentication_info.principal_email',
  // Entity risk / asset criticality (read straight off the alert; no extra query).
  'host.risk.calculated_score_norm',
  'user.risk.calculated_score_norm',
  'host.asset.criticality',
  'user.asset.criticality',
];

// MITRE ids. A tactic id is `TA` + 4 digits (`TA0006`); a technique id is `T` +
// 4 digits (`T1056`), with sub-techniques adding `.###` (`T1056.002`) — we key
// at technique level, so the base `T####` is enough. Both forms also appear
// inside the ATT&CK reference URLs (…/tactics/TA0006/, …/techniques/T1056/002/),
// so a single regex sweep over every tactic / technique value — id OR reference
// — recovers the ids even when the alert carries only the reference URLs.
// `TA\d{4}` never matches a `T####` technique (the char after `T` is `A`, not a
// digit) and `T\d{4}` never matches a `TA####` tactic, so the two patterns do
// not cross-contaminate.
const TACTIC_ID_RE = /TA\d{4}/g;
const TECHNIQUE_ID_RE = /T\d{4}/g;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/**
 * Normalize a leaf value to the comma-joined string form the confidence core
 * expects (matching the anonymized-CSV multi-value convention). Nested objects
 * are not leaves and yield `undefined`.
 */
const toStringValue = (value: unknown): string | undefined => {
  if (value == null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const joined = value
      .filter((entry) => entry != null && typeof entry !== 'object')
      .map((entry) => String(entry))
      .join(',');
    return joined.length > 0 ? joined : undefined;
  }
  if (typeof value === 'object') {
    return undefined;
  }
  return String(value);
};

/**
 * Read a dotted field path from an alert document, tolerating both shapes an
 * alert can arrive in: a flattened dotted key (`doc['event.category']`) or a
 * nested object (`doc.event.category`). Arrays are joined with commas.
 */
const getField = (doc: Record<string, unknown>, path: string): string | undefined => {
  if (Object.prototype.hasOwnProperty.call(doc, path)) {
    return toStringValue(doc[path]);
  }

  const parts = path.split('.');
  let current: unknown = doc;
  for (const part of parts) {
    if (current != null && typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return toStringValue(current);
};

/** Recursively collect every primitive value under `node` as a string. */
const collectStrings = (node: unknown, acc: string[]): void => {
  if (node == null) {
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      collectStrings(item, acc);
    }
    return;
  }
  if (typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectStrings(value, acc);
    }
    return;
  }
  acc.push(String(node));
};

/**
 * Gather the tactic and technique id strings from an alert's threat data,
 * tolerating every shape it arrives in: a single nested `threat` object, an
 * array of threat objects (`threat: [{ tactic, technique }, …]`), or flattened
 * `threat.tactic.*` / `threat.technique.*` dotted keys. Ids and reference URLs
 * are both collected; the caller regex-extracts the ids.
 */
const collectThreatMitre = (
  source: Record<string, unknown>
): { tacticStrings: string[]; techniqueStrings: string[] } => {
  const tacticStrings: string[] = [];
  const techniqueStrings: string[] = [];

  const threat = source.threat;
  if (threat != null) {
    for (const node of Array.isArray(threat) ? threat : [threat]) {
      if (isPlainObject(node)) {
        collectStrings(node.tactic, tacticStrings);
        collectStrings(node.technique, techniqueStrings);
      }
    }
  }

  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith('threat.tactic')) {
      collectStrings(value, tacticStrings);
    } else if (key.startsWith('threat.technique')) {
      collectStrings(value, techniqueStrings);
    }
  }

  return { tacticStrings, techniqueStrings };
};

/** Regex-extract the distinct ids matching `pattern` across `strings`. */
const extractIds = (strings: string[], pattern: RegExp): string[] => {
  const ids = new Set<string>();
  for (const value of strings) {
    const matches = value.match(pattern);
    if (matches) {
      for (const match of matches) {
        ids.add(match);
      }
    }
  }
  return [...ids];
};

/**
 * Project raw ECS alert documents down to the flat, scoreable field-maps the
 * reusable confidence core consumes — the raw-alert counterpart of
 * `parseAnonymizedAlertsCsv`.
 *
 * Accepts both shapes an alert arrives in: an alert-trigger `event.alerts` item
 * (ECS fields at the top level) or an `elasticsearch.search` hit (ECS fields
 * nested under `_source`), so a workflow can pass either through unchanged.
 */
export const alertDocsToRows = (docs: Array<Record<string, unknown>>): ParsedAlertFields[] =>
  docs.map((doc) => {
    const source = isPlainObject(doc._source) ? doc._source : doc;
    const row: ParsedAlertFields = {};
    for (const field of SCORED_FIELDS) {
      const value = getField(source, field);
      if (value != null) {
        row[field] = value;
      }
    }

    // MITRE ids are pulled from tactic / technique ids OR their reference URLs,
    // across nested-object, array-of-threats, and flattened-key shapes.
    const { tacticStrings, techniqueStrings } = collectThreatMitre(source);
    const tactics = extractIds(tacticStrings, TACTIC_ID_RE);
    const techniques = extractIds(techniqueStrings, TECHNIQUE_ID_RE);
    if (tactics.length > 0) {
      row['threat.tactic.id'] = tactics.join(',');
    }
    if (techniques.length > 0) {
      row['threat.technique.id'] = techniques.join(',');
    }

    return row;
  });

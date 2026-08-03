/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedAlertFields } from '@kbn/discoveries/impl/confidence';

/**
 * The ECS / alerts-as-data fields the deterministic confidence factors read.
 * Everything else in an alert document is ignored for scoring.
 */
const SCORED_FIELDS: readonly string[] = [
  'event.category',
  'event.dataset',
  'threat.tactic.id',
  'threat.technique.id',
  'host.name',
  'user.name',
  'process.code_signature.trusted',
  'kibana.alert.severity',
  'kibana.alert.workflow_status',
];

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

/**
 * Project raw ECS alert documents down to the flat, scoreable field-maps the
 * reusable confidence core consumes — the raw-alert counterpart of
 * `parseAnonymizedAlertsCsv`.
 */
export const alertDocsToRows = (docs: Array<Record<string, unknown>>): ParsedAlertFields[] =>
  docs.map((doc) => {
    const row: ParsedAlertFields = {};
    for (const field of SCORED_FIELDS) {
      const value = getField(doc, field);
      if (value != null) {
        row[field] = value;
      }
    }
    return row;
  });

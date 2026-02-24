/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Utility functions for the Hybrid Alert Deduplication system.
 *
 * Includes dotted-path value access, entity statistics tracking,
 * alert display formatting, and alert field cleanup for LLM calls.
 *
 * Ported from https://github.com/elastic/alert-clustering
 */

import { RULE_FIELDS, TRIAGE_FIELDS, ENTITY_FIELDS, LOW_QUALITY_ENTITIES } from './types';
import type { AlertDocument, EnrichedAlert, EntityStats } from './types';

// ============================================================
// Dotted-path value access
// ============================================================

/**
 * Get a value from a nested object using a dotted key path.
 *
 * First checks if the full dotted key exists as a literal key in the object,
 * then walks the path segment by segment. Arrays without an index offset
 * default to the first element.
 *
 * @example
 * getVal({ process: { name: 'bash' } }, 'process.name') // => 'bash'
 * getVal({ 'process.name': 'bash' }, 'process.name')    // => 'bash'
 */
export const getVal = (alert: AlertDocument, keys: string): unknown => {
  // Check if the full dotted key is a literal key in the alert
  if (keys in alert) {
    return alert[keys];
  }

  // Walk the keys segment by segment
  const parts = keys.split('.');
  let result: unknown = alert;

  for (const key of parts) {
    if (result == null) {
      return undefined;
    }

    if (Array.isArray(result)) {
      // If no offset into array is specified, grab the first entry
      result = result.length > 0 ? result[0] : undefined;
    }

    if (result != null && typeof result === 'object') {
      result = (result as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return result;
};

// ============================================================
// Rule name extraction
// ============================================================

/**
 * Extract the rule name from an alert by checking the configured rule fields in order.
 */
export const getRuleName = (alert: AlertDocument): string | undefined => {
  for (const field of RULE_FIELDS) {
    const val = getVal(alert, field);
    if (val != null) {
      return String(val);
    }
  }
  return undefined;
};

// ============================================================
// Entity statistics
// ============================================================

/**
 * Compute entity statistics for a set of alerts.
 * Tracks the total count and unique values per entity field.
 */
export const getEntityStats = (alerts: AlertDocument[]): EntityStats => {
  const entities: EntityStats = { total: 0 };

  for (const alert of alerts) {
    entities.total = (entities.total as number) + 1;

    for (const entityField of ENTITY_FIELDS) {
      const entityVal = getVal(alert, entityField);
      if (entityVal == null) continue;

      const entityStr = String(entityVal);
      if ((LOW_QUALITY_ENTITIES as readonly string[]).includes(entityStr)) continue;

      if (!(entityField in entities)) {
        entities[entityField] = [];
      }
      const fieldValues = entities[entityField] as string[];
      if (!fieldValues.includes(entityStr)) {
        fieldValues.push(entityStr);
      }
    }
  }

  return entities;
};

/**
 * Merge entity statistics from an added alert into a base alert's entities.
 * Mutates the base alert's `entities` in place.
 */
export const updateEntityStats = (baseAlert: EnrichedAlert, addedAlert: EnrichedAlert): void => {
  if (!addedAlert.entities) {
    addedAlert.entities = getEntityStats([addedAlert]);
  }

  const baseEntities = baseAlert.entities!;
  const addedEntities = addedAlert.entities;

  for (const entity of Object.keys(baseEntities)) {
    if (!(entity in addedEntities)) continue;

    if (entity === 'total') {
      (baseEntities.total as number) += addedEntities.total as number;
    } else {
      const baseValues = baseEntities[entity] as string[];
      const addedValues = addedEntities[entity] as string[];
      for (const e of addedValues) {
        if (!baseValues.includes(e)) {
          baseValues.push(e);
        }
      }
    }
  }
};

// ============================================================
// Alert display
// ============================================================

/**
 * Format an alert for human-readable display.
 * Returns a multi-line string with rule name, entity stats, and triage field values.
 */
export const displayAlert = (alert: EnrichedAlert, commonFields?: string[]): string => {
  let output = '';
  const ruleName = getRuleName(alert);

  if (alert.entities) {
    let entityStr = '';
    for (const [entity, values] of Object.entries(alert.entities)) {
      if (entity === 'total') continue;
      if (Array.isArray(values)) {
        entityStr += `${entity}: ${values.length} `;
      }
    }
    output += `Rule: ${ruleName}, Total: ${alert.entities.total}, ${entityStr}\n`;
  } else {
    output += `Rule: ${ruleName}\n`;
  }

  output += `event.id: ${getVal(alert, 'event.id')}\n`;

  const fields: string[] = [...TRIAGE_FIELDS];
  for (const f of commonFields ?? []) {
    if (!fields.includes(f)) fields.push(f);
  }

  for (const field of fields) {
    const val = getVal(alert, field);
    if (val != null) {
      let valStr = String(val);
      if (valStr.length > 256) valStr = `${valStr.slice(0, 256)}....`;
      output += `   ${field}: ${valStr}\n`;
    }
  }

  return output;
};

// ============================================================
// Alert field cleanup for LLM
// ============================================================

/**
 * Prune values that exceed a byte size threshold.
 * - Strings are truncated.
 * - Arrays are recursively pruned and then truncated.
 * - Dicts are recursively pruned.
 */
export const pruneLargeValues = (data: unknown, maxBytes = 512): unknown => {
  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      record[key] = pruneLargeValues(record[key], maxBytes);
    }
    return record;
  }

  if (Array.isArray(data)) {
    const pruned = data.map((item) => pruneLargeValues(item, maxBytes));
    return pruned.slice(0, maxBytes);
  }

  if (typeof data === 'string') {
    if (data.length > maxBytes) {
      return data.slice(0, maxBytes);
    }
    return data;
  }

  return data;
};

/** Fields to remove from alerts before sending to the LLM */
const CLEANUP_FIELDS = [
  'Events',
  'Responses',
  'threat',
  'Endpoint',
  'cloud',
  'vector',
  'entities',
  'common_fields',
  'followers',
  'exceptions',
] as const;

/**
 * Remove unnecessary and large fields from an alert as preparation
 * before calling into the LLM. Returns a deep-pruned copy.
 */
export const cleanupAlertFields = (alertOriginal: AlertDocument): AlertDocument => {
  // Deep clone
  const alert = JSON.parse(JSON.stringify(alertOriginal)) as Record<string, unknown>;
  const pruned = pruneLargeValues(alert) as Record<string, unknown>;

  for (const field of CLEANUP_FIELDS) {
    delete pruned[field];
  }

  return pruned;
};

// ============================================================
// Group alerts by field value
// ============================================================

/**
 * Group alerts by the first non-null value from a list of fields.
 * Returns a map of field value → alerts.
 */
export const groupByDistinctValue = (
  alerts: AlertDocument[],
  fields: readonly string[]
): Map<string, AlertDocument[]> => {
  const groups = new Map<string, AlertDocument[]>();

  for (const alert of alerts) {
    let val: unknown;
    for (const f of fields) {
      val = getVal(alert, f);
      if (val != null) break;
    }

    const key = String(val ?? 'unknown');
    const existing = groups.get(key) ?? [];
    existing.push(alert);
    groups.set(key, existing);
  }

  return groups;
};

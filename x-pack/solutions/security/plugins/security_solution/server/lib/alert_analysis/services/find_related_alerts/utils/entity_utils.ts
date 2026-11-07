/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get } from 'lodash';
import { RELATED_ALERT_ENTITY_LIST_MAX_LENGTH } from '../../../../../../common/api/alert_analysis/related_alerts';

export interface SourceEntities {
  hostNames: string[];
  userNames: string[];
  sourceIps: string[];
  destIps: string[];
}

// Command lines, messages and rule descriptions are attacker-controllable free text that reaches the
// model verbatim; the skill prompt tells it to treat them as data, never as instructions.
export const RELATED_ALERT_SOURCE_ALLOWLIST = [
  '@timestamp',
  'kibana.alert.rule.name',
  'kibana.alert.severity',
  'kibana.alert.risk_score',
  'kibana.alert.workflow_status',
  'kibana.alert.reason',
  'kibana.alert.rule.threat',
  'host.name',
  'user.name',
  'source.ip',
  'destination.ip',
  'process.name',
  'process.executable',
  'process.command_line',
  'process.parent.command_line',
  'kibana.alert.rule.description',
  'file.name',
  'file.path',
  'message',
] as const;

// `_source` filtering cannot truncate, so these long fields are capped after the search.
export const RELATED_ALERT_TRUNCATED_FIELD_MAX_LENGTHS: Readonly<Record<string, number>> = {
  'process.command_line': 300,
  'process.parent.command_line': 300,
  message: 300,
  'kibana.alert.reason': 300,
  'kibana.alert.rule.name': 200,
  'kibana.alert.rule.description': 200,
  'process.executable': 200,
  'file.path': 200,
};

// Multi-valued capped fields keep only their first values so total payload stays bounded.
const CAPPED_FIELD_MAX_ARRAY_ITEMS = 5;

export const RELATED_ALERT_ENTITY_SOURCE_INCLUDES = [
  'host.name',
  'user.name',
  'source.ip',
  'destination.ip',
] as const;

export const extractSourceEntitiesFromAlert = (
  alertSource: Record<string, unknown>
): SourceEntities => ({
  hostNames: trimEntityValues(getEntityFieldValues(alertSource, 'host.name')),
  userNames: trimEntityValues(getEntityFieldValues(alertSource, 'user.name')),
  sourceIps: trimEntityValues(getEntityFieldValues(alertSource, 'source.ip')),
  destIps: trimEntityValues(getEntityFieldValues(alertSource, 'destination.ip')),
});

export function trimEntityValues(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const uniqueValues = [
    ...new Set(
      values.filter((value): value is string => typeof value === 'string' && value.length > 0)
    ),
  ];
  return uniqueValues.slice(0, RELATED_ALERT_ENTITY_LIST_MAX_LENGTH);
}

export function getEntityFieldValues(obj: Record<string, unknown>, path: string): string[] {
  const nestedValue = get(obj, path);
  if (nestedValue !== undefined) {
    return normalizeToStringArray(nestedValue);
  }

  const flatValue = obj[path];
  if (flatValue !== undefined) {
    return normalizeToStringArray(flatValue);
  }

  return [];
}

export function normalizeToStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

const TRUNCATION_SUFFIX = '… [truncated]';

const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  const lastCode = value.charCodeAt(maxLength - 1);
  // Don't end on a lone high surrogate: that would emit an invalid UTF-16 string.
  const cut = lastCode >= 0xd800 && lastCode <= 0xdbff ? maxLength - 1 : maxLength;
  return `${value.slice(0, cut)}${TRUNCATION_SUFFIX}`;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// MITRE `reference` URLs are ~29% of a typical related-alerts payload and add nothing the model needs.
const THREAT_PATH = 'kibana.alert.rule.threat';
const isThreatReferencePath = (path: string): boolean =>
  path.startsWith(`${THREAT_PATH}.`) && path.endsWith('.reference');

const truncateNode = (node: Record<string, unknown>, prefix: string): void => {
  const truncateValue = (value: unknown, path: string): unknown => {
    const isCapped = Object.hasOwn(RELATED_ALERT_TRUNCATED_FIELD_MAX_LENGTHS, path);
    if (typeof value === 'string') {
      return isCapped
        ? truncateString(value, RELATED_ALERT_TRUNCATED_FIELD_MAX_LENGTHS[path])
        : value;
    }
    if (Array.isArray(value)) {
      const items = isCapped ? value.slice(0, CAPPED_FIELD_MAX_ARRAY_ITEMS) : value;
      return items.map((item) => truncateValue(item, path));
    }
    if (isPlainObject(value)) {
      truncateNode(value, path);
    }
    return value;
  };

  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isThreatReferencePath(path)) {
      delete node[key];
    } else {
      node[key] = truncateValue(value, path);
    }
  }
};

// Matches the joined path of each leaf (and drops threat `reference` keys), so dotted, nested and mixed `_source` shapes all work.
export const truncateRelatedAlertLongFields = (
  source: Record<string, unknown>
): Record<string, unknown> => {
  const result = cloneDeep(source);
  truncateNode(result, '');
  return result;
};

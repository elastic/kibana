/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, get } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { RELATED_ALERT_ENTITY_LIST_MAX_LENGTH } from '../../../../../../common/api/alert_analysis/related_alerts';

export interface SourceEntities {
  hostNames: string[];
  userNames: string[];
  sourceIps: string[];
  destIps: string[];
}

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

/**
 * Long free-text fields included in related alerts. `_source` filtering cannot truncate, so these
 * are capped after the search to keep up to RELATED_ALERTS_INLINE_MAX_RESULTS alerts bounded.
 */
export const RELATED_ALERT_TRUNCATED_FIELD_MAX_LENGTHS: Readonly<Record<string, number>> = {
  'process.command_line': 300,
  'process.parent.command_line': 300,
  'kibana.alert.rule.description': 200,
};

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

const truncateString = (value: string, maxLength: number): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}… [truncated]` : value;

/** Caps long text fields; handles both nested and dotted `_source` shapes. Returns a copy. */
export const truncateRelatedAlertLongFields = (
  source: Record<string, unknown>
): Record<string, unknown> => {
  const result = cloneDeep(source);
  for (const [path, maxLength] of Object.entries(RELATED_ALERT_TRUNCATED_FIELD_MAX_LENGTHS)) {
    const target: string | string[] = result[path] !== undefined ? [path] : path;
    const value: unknown = get(result, target);
    if (typeof value === 'string') {
      set(result, target, truncateString(value, maxLength));
    } else if (Array.isArray(value)) {
      set(
        result,
        target,
        value.map((item) => (typeof item === 'string' ? truncateString(item, maxLength) : item))
      );
    }
  }
  return result;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

/**
 * The raw `_source` of an alert document from Elasticsearch.
 *
 * Alert documents contain a mix of Kibana alert metadata (`kibana.alert.*`)
 * and arbitrary ECS fields (`process.*`, `dns.*`, `cloud.*`, etc.) that vary
 * by rule type and data source. The existing `DetectionAlert` types only cover
 * the Kibana-managed fields and still include an open index signature, so they
 * don't provide meaningful safety for the ECS fields we access via dot-path
 * `get()` helpers. We keep this intentionally loose to reflect the reality of
 * what Elasticsearch returns.
 */
export type AlertSource = Record<string, unknown>;

export const toStringArray = (value: unknown): string[] | undefined => {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    const out = value
      .map((x) => (x == null ? '' : String(x)))
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    return out.length ? out : undefined;
  }

  const asString = String(value).trim();
  return asString.length ? [asString] : undefined;
};

export const getValues = (source: AlertSource, field: string): string[] | undefined =>
  toStringArray(get(field, source));

export const joinValues = (values: string[] | undefined): string | undefined =>
  values != null && values.length ? values.join(', ') : undefined;

export const getSingleValue = (source: AlertSource, field: string): string | undefined =>
  joinValues(getValues(source, field));

export const getNumberValue = (source: AlertSource, field: string): number | undefined => {
  const v = get(field, source);
  if (v == null) return undefined;
  if (Array.isArray(v)) {
    const first = v[0];
    const asNumber = typeof first === 'number' ? first : Number(first);
    return Number.isFinite(asNumber) ? asNumber : undefined;
  }
  const asNumber = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(asNumber) ? asNumber : undefined;
};

export const normalizeSpaces = (text: string): string =>
  text
    .replace(/,\s*/g, ', ')
    .replace(/\s+([,.:;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

export const categoryIs = (source: AlertSource, value: string): boolean =>
  getValues(source, 'event.category')?.some((c) => c.toLowerCase() === value) ?? false;

export const datasetIs = (source: AlertSource, value: string): boolean =>
  getSingleValue(source, 'event.dataset')?.toLowerCase() === value;

export const ruleTypeIs = (source: AlertSource, value: string): boolean =>
  getSingleValue(source, 'kibana.alert.rule.type')?.toLowerCase() === value;

export const appendAlertSuffix = (text: string, source: AlertSource): string => {
  const severity = getSingleValue(source, 'kibana.alert.severity');
  const ruleName = getSingleValue(source, 'kibana.alert.rule.name');
  let result = text;

  if (severity != null) {
    result += ` created ${severity} alert`;
    if (ruleName != null) {
      result += ` ${ruleName}.`;
    } else {
      result += '.';
    }
  } else if (ruleName != null) {
    result += ` ${ruleName}.`;
  }

  return result;
};

export const appendUserHostContext = (text: string, source: AlertSource): string => {
  const userName = getSingleValue(source, 'user.name');
  const hostName = getSingleValue(source, 'host.name');
  let result = text;

  if (userName != null) result += ` by ${userName}`;
  if (hostName != null) result += ` on ${hostName}`;

  return result;
};

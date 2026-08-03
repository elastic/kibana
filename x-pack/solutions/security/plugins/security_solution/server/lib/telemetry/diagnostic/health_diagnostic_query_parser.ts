/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as YAML from 'yaml';
import {
  QueryType,
  Action,
  type HealthDiagnosticQuery,
  type HealthDiagnosticQueryV1,
  type HealthDiagnosticQueryV2,
  type HealthDiagnosticQueryV3,
  type ParseFailureQuery,
} from './health_diagnostic_service.types';

export const parseHealthDiagnosticQueries = (input: unknown): HealthDiagnosticQuery[] =>
  YAML.parseAllDocuments(input as string).map(parseOne);

const parseOne = (doc: YAML.Document): HealthDiagnosticQuery => {
  const raw = doc.toJSON() as Record<string, unknown> | null;
  const version = raw?.version;

  try {
    if (version === undefined || version === 1) {
      return parseV1(raw);
    } else if (version === 2) {
      return parseV2(raw);
    } else if (version === 3) {
      return parseV3(raw);
    } else {
      return parseUnknown(raw);
    }
  } catch {
    return parseUnknown(raw);
  }
};

const parseV1 = (raw: Record<string, unknown> | null): HealthDiagnosticQueryV1 => {
  assertRequiredString(raw, 'id');
  assertRequiredString(raw, 'name');
  assertRequiredString(raw, 'index');
  assertRequiredEnum(raw, 'type', Object.values(QueryType));
  assertRequiredString(raw, 'query');
  assertRequiredString(raw, 'scheduleCron');
  assertRequiredObject(raw, 'filterlist');
  assertFilterlistActions(raw);
  assertRequiredBoolean(raw, 'enabled');

  return { ...(raw as Record<string, unknown>), version: 1 } as HealthDiagnosticQueryV1;
};

const parseV2 = (raw: Record<string, unknown> | null): HealthDiagnosticQueryV2 => {
  assertRequiredString(raw, 'id');
  assertRequiredString(raw, 'name');
  assertRequiredEnum(raw, 'type', Object.values(QueryType));
  assertRequiredString(raw, 'query');
  assertRequiredString(raw, 'scheduleCron');
  assertRequiredObject(raw, 'filterlist');
  assertFilterlistActions(raw);
  assertRequiredBoolean(raw, 'enabled');

  const hasIntegrations = raw && typeof raw.integrations === 'string' && raw.integrations !== '';
  const hasIndex = raw && typeof raw.index === 'string' && raw.index !== '';
  if (!hasIntegrations && !hasIndex) {
    throw new Error('v2 descriptor must have either integrations or index');
  }
  if (hasIntegrations && hasIndex) {
    throw new Error('v2 descriptor must not have both integrations and index');
  }

  const integrations = hasIntegrations
    ? (raw.integrations as string)
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : undefined;

  if (integrations !== undefined && integrations.length === 0) {
    throw new Error('integrations must contain at least one non-empty pattern');
  }

  const typesRaw = (raw as Record<string, unknown>).datastreamTypes;
  if (typesRaw !== undefined && typesRaw !== null) {
    if (typeof typesRaw !== 'string' || typesRaw.trim() === '') {
      throw new Error('datastreamTypes must be a non-empty comma-separated string when present');
    }
  }
  const types =
    hasIntegrations && typeof typesRaw === 'string'
      ? typesRaw
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
      : undefined;

  const { datastreamTypes: _drop, ...rest } = raw as Record<string, unknown>;
  return {
    ...rest,
    version: 2,
    ...(integrations !== undefined ? { integrations } : {}),
    ...(types !== undefined ? { datastreamTypes: types } : {}),
  } as HealthDiagnosticQueryV2;
};

const API_QUERY_REQUIRED_FIELDS = [
  'id',
  'name',
  'version',
  'type',
  'api',
  'scheduleCron',
  'enabled',
  'filterlist',
] as const;

const API_QUERY_OPTIONAL_FIELDS = [
  'responsePath',
  'pathParams',
  'queryParams',
  'responsePathKey',
  'integrations',
  'encryptionKeyId',
] as const;

const API_QUERY_FORBIDDEN_FIELDS = ['query', 'index', 'size', 'datastreamTypes', 'tiers'] as const;

const INDEX_QUERY_FORBIDDEN_FIELDS_V3 = [
  'api',
  'pathParams',
  'queryParams',
  'responsePath',
] as const;

const parseV3 = (raw: Record<string, unknown> | null): HealthDiagnosticQuery => {
  if (!raw || typeof raw !== 'object') {
    return parseUnknown(raw);
  }
  const type = raw.type;

  if (type === 'API') {
    for (const field of API_QUERY_FORBIDDEN_FIELDS) {
      if (field in raw) {
        return parseUnknown(raw);
      }
    }
    const knownFields = new Set<string>([
      ...API_QUERY_REQUIRED_FIELDS,
      ...API_QUERY_OPTIONAL_FIELDS,
    ]);
    for (const key of Object.keys(raw)) {
      if (!knownFields.has(key)) {
        return parseUnknown(raw);
      }
    }
    try {
      const api = assertRequiredString(raw, 'api');
      const pathParams = raw.pathParams as Record<string, string> | undefined;
      assertPathParamsCoverage(api, pathParams);
      return {
        id: assertRequiredString(raw, 'id'),
        name: assertRequiredString(raw, 'name'),
        version: 3 as const,
        type: 'API' as const,
        api,
        responsePath: raw.responsePath as string | undefined,
        scheduleCron: assertRequiredString(raw, 'scheduleCron'),
        enabled: assertRequiredBoolean(raw, 'enabled'),
        filterlist: assertFilterlist(raw),
        pathParams,
        queryParams: raw.queryParams as Record<string, string | number> | undefined,
        responsePathKey: raw.responsePathKey as string | undefined,
        integrations: normalizeIntegrations(raw.integrations),
        encryptionKeyId: raw.encryptionKeyId as string | undefined,
      } satisfies HealthDiagnosticQueryV3;
    } catch (err) {
      return parseUnknown(raw);
    }
  }

  if (type === 'DSL' || type === 'EQL' || type === 'ESQL') {
    for (const field of INDEX_QUERY_FORBIDDEN_FIELDS_V3) {
      if (field in raw) {
        return parseUnknown(raw);
      }
    }
    return parseV2({ ...raw, version: 2 });
  }

  return parseUnknown(raw);
};

const parseUnknown = (raw: unknown): ParseFailureQuery => {
  const obj = raw as Record<string, unknown> | null;
  return {
    id: obj?.id as string | undefined,
    name: obj?.name as string | undefined,
    _raw: raw,
  };
};

const assertRequiredString = (raw: Record<string, unknown> | null, field: string): string => {
  if (!raw || typeof raw[field] !== 'string' || raw[field] === '') {
    throw new Error(`Missing or invalid required field: ${field}`);
  }
  return raw[field] as string;
};

const assertRequiredObject = (raw: Record<string, unknown> | null, field: string): void => {
  if (!raw || typeof raw[field] !== 'object' || raw[field] === null || Array.isArray(raw[field])) {
    throw new Error(`Missing or invalid required field: ${field}`);
  }
};

const assertRequiredEnum = (
  raw: Record<string, unknown> | null,
  field: string,
  values: readonly string[]
): void => {
  if (!raw || !values.includes(raw[field] as string)) {
    throw new Error(`Missing or invalid required field: ${field}`);
  }
};

const assertFilterlistActions = (raw: Record<string, unknown> | null): void => {
  const fl = raw?.filterlist as Record<string, unknown>;
  const validActions = Object.values(Action) as string[];
  for (const value of Object.values(fl)) {
    if (!validActions.includes(value as string)) {
      throw new Error(`Invalid filterlist action value: ${value}`);
    }
  }
};

const assertRequiredBoolean = (raw: Record<string, unknown> | null, field: string): boolean => {
  if (!raw || typeof raw[field] !== 'boolean') {
    throw new Error(`Missing or invalid required field: ${field}`);
  }
  return raw[field] as boolean;
};

const assertFilterlist = (raw: Record<string, unknown> | null): Record<string, Action> => {
  assertRequiredObject(raw, 'filterlist');
  assertFilterlistActions(raw);
  if (!raw) {
    throw new Error('Missing or invalid required field: filterlist');
  }
  return raw.filterlist as Record<string, Action>;
};

const normalizeIntegrations = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    const parts = value
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    return parts.length > 0 ? parts : undefined;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
    return value.length > 0 ? value : undefined;
  }
  throw new Error('integrations must be a comma-separated string or array of strings');
};

const assertPathParamsCoverage = (
  api: string,
  pathParams: Record<string, string> | undefined
): void => {
  const placeholders = [...api.matchAll(/\{([^}]+)\}/g)].map(([, key]) => key);
  for (const key of placeholders) {
    if (!pathParams || !(key in pathParams)) {
      throw new Error(`Missing path parameter '${key}' for API template: ${api}`);
    }
  }
};

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

const parseUnknown = (raw: unknown): ParseFailureQuery => {
  const obj = raw as Record<string, unknown> | null;
  return {
    id: obj?.id as string | undefined,
    name: obj?.name as string | undefined,
    _raw: raw,
  };
};

const assertRequiredString = (raw: Record<string, unknown> | null, field: string): void => {
  if (!raw || typeof raw[field] !== 'string' || raw[field] === '') {
    throw new Error(`Missing or invalid required field: ${field}`);
  }
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

const assertRequiredBoolean = (raw: Record<string, unknown> | null, field: string): void => {
  if (!raw || typeof raw[field] !== 'boolean') {
    throw new Error(`Missing or invalid required field: ${field}`);
  }
};

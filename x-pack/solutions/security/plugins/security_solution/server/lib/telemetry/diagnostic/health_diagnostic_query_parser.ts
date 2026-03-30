/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as YAML from 'yaml';
import type {
  HealthDiagnosticQuery,
  HealthDiagnosticQueryV1,
  HealthDiagnosticQueryV2,
  ParseFailureQuery,
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
  assertRequiredString(raw, 'type');
  assertRequiredString(raw, 'query');
  assertRequiredString(raw, 'scheduleCron');
  assertRequiredObject(raw, 'filterlist');
  assertRequiredBoolean(raw, 'enabled');

  return { ...(raw as Record<string, unknown>), version: 1 } as HealthDiagnosticQueryV1;
};

const parseV2 = (raw: Record<string, unknown> | null): HealthDiagnosticQueryV2 => {
  assertRequiredString(raw, 'id');
  assertRequiredString(raw, 'name');
  assertRequiredString(raw, 'integrations');
  assertRequiredString(raw, 'type');
  assertRequiredString(raw, 'query');
  assertRequiredString(raw, 'scheduleCron');
  assertRequiredObject(raw, 'filterlist');
  assertRequiredBoolean(raw, 'enabled');

  const integrations = ((raw as Record<string, unknown>).integrations as string)
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const typesRaw = (raw as Record<string, unknown>).datastreamTypes;
  const types =
    typeof typesRaw === 'string'
      ? typesRaw
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
      : undefined;

  return {
    ...(raw as Record<string, unknown>),
    version: 2,
    integrations,
    datastreamTypes: types,
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
  if (!raw || typeof raw[field] !== 'object' || raw[field] === null) {
    throw new Error(`Missing or invalid required field: ${field}`);
  }
};

const assertRequiredBoolean = (raw: Record<string, unknown> | null, field: string): void => {
  if (!raw || typeof raw[field] !== 'boolean') {
    throw new Error(`Missing or invalid required field: ${field}`);
  }
};

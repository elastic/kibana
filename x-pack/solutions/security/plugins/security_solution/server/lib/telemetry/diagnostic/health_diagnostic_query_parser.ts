/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import * as YAML from 'yaml';
import {
  Action,
  QueryType,
  type HealthDiagnosticQuery,
  type IndexQuery,
  type ApiQuery,
  type ParseFailureQuery,
} from './health_diagnostic_service.types';

// Versions this parser recognises; anything else → unknown_version.
const VALID_VERSIONS = [1, 2, 3] as const;
type ValidVersion = (typeof VALID_VERSIONS)[number];

const filterlistSchema = z.record(z.string(), z.nativeEnum(Action));
const queryTypeSchema = z.nativeEnum(QueryType);

// ---------------------------------------------------------------------------
// Shared index-query logic (used by v2 and v3 index schemas)
// ---------------------------------------------------------------------------

// Field definitions shared between v2 and v3 index schemas to avoid duplication.
const indexQueryFields = {
  id: z.string().min(1),
  name: z.string().min(1),
  type: queryTypeSchema,
  query: z.string().min(1),
  scheduleCron: z.string().min(1),
  filterlist: filterlistSchema,
  enabled: z.boolean(),
  // Exactly one of index or integrations must be present (enforced in validateIndexQuery).
  integrations: z.string().optional(),
  index: z.string().optional(),
  // Only meaningful when integrations is set; dropped otherwise in transformIndexQuery.
  datastreamTypes: z.string().optional(),
  size: z.number().optional(),
  tiers: z.array(z.string()).optional(),
  encryptionKeyId: z.string().min(1).optional(),
};

interface IndexQueryRaw {
  integrations?: string;
  index?: string;
  datastreamTypes?: string;
  id: string;
  name: string;
  scheduleCron: string;
  filterlist: Record<string, Action>;
  enabled: boolean;
  type: QueryType;
  query: string;
  size?: number;
  tiers?: string[];
  encryptionKeyId?: string;
}

const validateIndexQuery = (data: IndexQueryRaw, ctx: z.RefinementCtx): void => {
  const hasIntegrations = typeof data.integrations === 'string' && data.integrations !== '';
  const hasIndex = typeof data.index === 'string' && data.index !== '';

  if (!hasIntegrations && !hasIndex) {
    ctx.addIssue({
      code: 'custom',
      message: 'must have either integrations or index',
    });
    return;
  }
  if (hasIntegrations && hasIndex) {
    ctx.addIssue({
      code: 'custom',
      message: 'must not have both integrations and index',
    });
    return;
  }
  if (hasIntegrations) {
    const parts = (data.integrations as string)
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'integrations must have at least one non-empty pattern',
      });
    }
  }
  if (data.datastreamTypes !== undefined) {
    if (typeof data.datastreamTypes !== 'string' || data.datastreamTypes.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'datastreamTypes must be a non-empty comma-separated string',
      });
    }
  }
};

const transformIndexQuery = (data: IndexQueryRaw): IndexQuery => {
  const hasIntegrations = typeof data.integrations === 'string' && data.integrations !== '';
  const hasIndex = typeof data.index === 'string' && data.index !== '';

  const integrations = hasIntegrations
    ? (data.integrations as string)
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : undefined;

  // datastreamTypes is dropped when index-based (no integration to scope it to).
  const datastreamTypes =
    hasIntegrations && typeof data.datastreamTypes === 'string'
      ? data.datastreamTypes
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p.length > 0)
      : undefined;

  const q: IndexQuery = {
    kind: 'index',
    id: data.id,
    name: data.name,
    scheduleCron: data.scheduleCron,
    filterlist: data.filterlist,
    enabled: data.enabled,
    type: data.type,
    query: data.query,
  };
  if (data.encryptionKeyId !== undefined) q.encryptionKeyId = data.encryptionKeyId;
  if (data.size !== undefined) q.size = data.size;
  if (data.tiers !== undefined) q.tiers = data.tiers;
  if (integrations !== undefined) q.integrations = integrations;
  if (datastreamTypes !== undefined) q.datastreamTypes = datastreamTypes;
  if (hasIndex) q.index = data.index as string;
  return q;
};

// ---------------------------------------------------------------------------
// Per-version schemas
// ---------------------------------------------------------------------------

// V1: index is required; no integrations/datastreamTypes support.
const v1Schema = z
  .object({ version: z.literal(1), ...indexQueryFields, index: z.string().min(1) })
  .transform(transformIndexQuery);

// V2: integrations XOR index (cross-field constraint in validateIndexQuery).
const v2Schema = z
  .object({ version: z.literal(2), ...indexQueryFields })
  .superRefine(validateIndexQuery)
  .transform(transformIndexQuery);

// V3 index: same rules as v2; .strict() additionally rejects api/pathParams/queryParams/responsePath.
const v3IndexSchema = z
  .object({ version: z.literal(3), ...indexQueryFields })
  .strict()
  .superRefine(validateIndexQuery)
  .transform(transformIndexQuery);

// V3 API integrations: accepts a comma-separated string OR a YAML string[] sequence,
// unlike v2 integrations which only accepts a string.
const v3IntegrationsSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') {
    return val
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
  return val; // arrays and invalid types pass through to schema validation
}, z.array(z.string().min(1)).min(1).optional());

// V3 API: targets a Kibana/ES HTTP endpoint.
// .strict() rejects index/query/tiers/datastreamTypes and any other unknown field.
const v3ApiSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    version: z.literal(3),
    type: z.literal('API'),
    api: z.string().min(1),
    responsePath: z.string().optional(),
    scheduleCron: z.string().min(1),
    enabled: z.boolean(),
    filterlist: filterlistSchema,
    pathParams: z.record(z.string(), z.string()).optional(),
    queryParams: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    responsePathKey: z.string().optional(),
    integrations: v3IntegrationsSchema,
    encryptionKeyId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // All {placeholder}s in the api template must have a matching pathParams entry.
    const placeholders = [...data.api.matchAll(/\{([^}]+)\}/g)].map(([, key]) => key);
    for (const key of placeholders) {
      if (!data.pathParams || !(key in data.pathParams)) {
        ctx.addIssue({
          code: 'custom',
          message: `Missing path parameter '${key}' for API template: ${data.api}`,
        });
      }
    }
  })
  .transform((data): ApiQuery => {
    const q: ApiQuery = {
      kind: 'api',
      id: data.id,
      name: data.name,
      scheduleCron: data.scheduleCron,
      filterlist: data.filterlist,
      enabled: data.enabled,
      api: data.api,
    };
    if (data.responsePath !== undefined) q.responsePath = data.responsePath;
    if (data.pathParams !== undefined) q.pathParams = data.pathParams;
    if (data.queryParams !== undefined) q.queryParams = data.queryParams;
    if (data.responsePathKey !== undefined) q.responsePathKey = data.responsePathKey;
    if (data.integrations !== undefined) q.integrations = data.integrations;
    if (data.encryptionKeyId !== undefined) q.encryptionKeyId = data.encryptionKeyId;
    return q;
  });

// ---------------------------------------------------------------------------
// Top-level schema
// ---------------------------------------------------------------------------

// .catch() maps any parse failure to ParseFailureQuery so callers never deal
// with Zod errors directly — the output type is always HealthDiagnosticQuery.
const QueryDescriptor: z.ZodType<HealthDiagnosticQuery> = z
  .preprocess((raw) => {
    if (!raw || typeof raw !== 'object') return raw;
    const obj = raw as Record<string, unknown>;
    // Descriptors without a version field are legacy v1.
    return 'version' in obj ? obj : { ...obj, version: 1 };
  }, z.union([v1Schema, v2Schema, v3ApiSchema, v3IndexSchema]))
  .catch((ctx) => {
    const raw = ctx.input as Record<string, unknown> | null;
    const version = raw?.version;
    // unknown_version: silently dropped, debug log only, no telemetry stat doc.
    // invalid_descriptor: warning logged + skipped stat doc emitted.
    const failureReason: ParseFailureQuery['failureReason'] =
      typeof version === 'number' && !VALID_VERSIONS.includes(version as ValidVersion)
        ? 'unknown_version'
        : 'invalid_descriptor';
    // z.catch() must return the schema's output type; cast here so the outer
    // z.ZodType<HealthDiagnosticQuery> annotation covers ParseFailureQuery at call sites.
    return {
      id: raw?.id as string | undefined,
      name: raw?.name as string | undefined,
      _raw: ctx.input,
      failureReason,
    } as unknown as IndexQuery;
  });

export const parseHealthDiagnosticQueries = (input: unknown): HealthDiagnosticQuery[] =>
  YAML.parseAllDocuments(input as string).map((doc) => QueryDescriptor.parse(doc.toJSON()));

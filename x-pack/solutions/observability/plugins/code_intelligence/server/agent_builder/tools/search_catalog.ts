/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { createOtherResult, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';

import {
  CATALOG_SEVERITIES,
  CATALOG_SIGNAL_TYPES,
  CATALOG_SORTS,
  MAX_CATALOG_REPOSITORY_FILTERS,
} from '../../../common/catalog_filters';
import { MAX_REPOSITORY_IDENTITY_LENGTH } from '../../../common/repository_settings';
import { searchCatalog, type CatalogEntry } from '../../catalog_service';
import {
  CATALOG_QUERY_NOTE,
  CODE_INTELLIGENCE_TOOL_IDS,
  CODE_INTELLIGENCE_TOOL_TAGS,
  type CodeIntelligenceToolDependencies,
} from './types';

export const MAX_SEARCH_CATALOG_PER_PAGE = 50;
const DEFAULT_SEARCH_CATALOG_PER_PAGE = 20;

const schema = z.object({
  q: z
    .string()
    .min(1)
    .max(512)
    .optional()
    .describe('Free text matched semantically against entry titles and descriptions.'),
  repositories: z
    .array(z.string().min(3).max(MAX_REPOSITORY_IDENTITY_LENGTH))
    .max(MAX_CATALOG_REPOSITORY_FILTERS)
    .optional()
    .describe('Repository identities as owner/name; an entry matches any of them.'),
  signalTypes: z
    .array(z.enum(CATALOG_SIGNAL_TYPES))
    .optional()
    .describe('log for log lines, trace for spans and span attributes, metric for metrics.'),
  severities: z
    .array(z.enum(CATALOG_SEVERITIES))
    .optional()
    .describe(
      'low (debug, info), medium (warn), high (error), critical (fatal); an entry matches any of them.'
    ),
  sort: z
    .enum(CATALOG_SORTS)
    .optional()
    .describe('default orders by relevance when q is set, otherwise by most recently updated.'),
  page: z.number().int().min(1).max(100).optional().describe('1-based page number.'),
  perPage: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      `Entries per page. Defaults to ${DEFAULT_SEARCH_CATALOG_PER_PAGE}; values above ${MAX_SEARCH_CATALOG_PER_PAGE} are capped.`
    ),
});

interface EvidenceLocation {
  readonly path: string;
  readonly line?: number;
}

const evidenceLocations = (evidence: unknown): EvidenceLocation[] =>
  Array.isArray(evidence)
    ? evidence.flatMap((location: unknown) => {
        if (typeof location !== 'object' || location === null) return [];
        const { path, line } = location as { path?: unknown; line?: unknown };
        if (typeof path !== 'string') return [];
        return [typeof line === 'number' ? { path, line } : { path }];
      })
    : [];

/** Keeps the fields the agent needs to pick and run an entry; evidence excerpts are dropped to bound the prompt. */
export const trimCatalogEntry = ({
  id,
  repository,
  signal_type: signalType,
  title,
  description,
  query,
  severity_score: severityScore,
  revision,
  evidence,
}: CatalogEntry) => ({
  id,
  repository,
  signal_type: signalType,
  title,
  description,
  query,
  ...(severityScore === undefined ? {} : { severity_score: severityScore }),
  revision,
  evidence: evidenceLocations(evidence),
});

export const createSearchCatalogTool = ({
  catalogIndex,
}: CodeIntelligenceToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: CODE_INTELLIGENCE_TOOL_IDS.searchCatalog,
  type: ToolType.builtin,
  description: `Searches the Code Intelligence catalog: entries derived from a repository's source code that describe what the service logs and which OpenTelemetry spans, metrics, and attributes it emits. Each entry has a title, a description, a severity, the source file paths it came from, and a ready-to-run ES|QL query.

When to use:
- The user asks what a service or repository logs, which errors it reports, or which spans, metrics, or attributes it emits.
- The user wants a query to find a specific log line, span, or metric in their data.

${CATALOG_QUERY_NOTE}`,
  schema,
  tags: CODE_INTELLIGENCE_TOOL_TAGS,
  annotations: {
    title: 'Search the Code Intelligence Catalog',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (
    { q, repositories, signalTypes, severities, sort, page, perPage },
    { esClient }
  ) => {
    const result = await searchCatalog(esClient.asCurrentUser, catalogIndex, {
      repositories: repositories ?? [],
      signalTypes: signalTypes ?? [],
      severities: severities ?? [],
      ...(q === undefined ? {} : { q }),
      ...(sort === undefined ? {} : { sort }),
      page: page ?? 1,
      perPage: Math.min(perPage ?? DEFAULT_SEARCH_CATALOG_PER_PAGE, MAX_SEARCH_CATALOG_PER_PAGE),
    });
    return {
      results: [
        createOtherResult({
          total: result.total,
          page: result.page,
          perPage: result.perPage,
          items: result.items.map(trimCatalogEntry),
        }),
      ],
    };
  },
});

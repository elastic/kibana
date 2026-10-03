/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { createOtherResult, type BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod/v4';

import { CATALOG_SIGNAL_TYPES } from '../../../common/catalog_filters';
import { FINDING_STATUSES, MAX_FINDING_REPOSITORY_FILTERS } from '../../../common/finding_filters';
import { MAX_REPOSITORY_IDENTITY_LENGTH } from '../../../common/repository_settings';
import { searchFindings, type FindingEntry } from '../../findings_service';
import {
  CODE_INTELLIGENCE_TOOL_IDS,
  CODE_INTELLIGENCE_TOOL_TAGS,
  type CodeIntelligenceToolDependencies,
} from './types';

export const MAX_SEARCH_FINDINGS_PER_PAGE = 20;
const DEFAULT_SEARCH_FINDINGS_PER_PAGE = 10;

const schema = z.object({
  q: z.string().min(1).max(512).optional(),
  repositories: z
    .array(z.string().min(3).max(MAX_REPOSITORY_IDENTITY_LENGTH))
    .max(MAX_FINDING_REPOSITORY_FILTERS)
    .optional(),
  statuses: z
    .array(z.enum(FINDING_STATUSES))
    .max(FINDING_STATUSES.length)
    .optional()
    .describe('Review states to match. Defaults to open when omitted.'),
  signalTypes: z.array(z.enum(CATALOG_SIGNAL_TYPES)).max(CATALOG_SIGNAL_TYPES.length).optional(),
  page: z.number().int().min(1).max(100).optional(),
  perPage: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Findings per page. Defaults to 10; values above 20 are capped.'),
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

/** Keeps finding summaries and source locations, omitting excerpts from list results. */
export const trimFindingEntry = ({
  id,
  repository,
  finding_type: findingType,
  signal_type: signalType,
  status,
  title,
  summary,
  revision,
  cataloged,
  evidence,
}: FindingEntry) => ({
  id,
  repository,
  finding_type: findingType,
  signal_type: signalType,
  status,
  title,
  summary,
  revision,
  cataloged,
  evidence: evidenceLocations(evidence),
});

export const createSearchFindingsTool = ({
  findingsIndex,
}: CodeIntelligenceToolDependencies): BuiltinToolDefinition<typeof schema> => ({
  id: CODE_INTELLIGENCE_TOOL_IDS.searchFindings,
  type: ToolType.builtin,
  description:
    'Lists Code Intelligence findings: source lines flagged as exposing sensitive data in logs or telemetry. Use when the user asks which findings are open, what sensitive data a repository may be logging, or for a list to review. Defaults to open findings. Results include source locations but not excerpts; call get_finding for the full evidence.',
  schema,
  tags: CODE_INTELLIGENCE_TOOL_TAGS,
  annotations: {
    title: 'Search Code Intelligence Findings',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ q, repositories, statuses, signalTypes, page, perPage }, { esClient }) => {
    const result = await searchFindings(esClient.asCurrentUser, findingsIndex, {
      repositories: repositories ?? [],
      statuses: statuses ?? ['open'],
      signalTypes: signalTypes ?? [],
      ...(q === undefined ? {} : { q }),
      page: page ?? 1,
      perPage: Math.min(perPage ?? DEFAULT_SEARCH_FINDINGS_PER_PAGE, MAX_SEARCH_FINDINGS_PER_PAGE),
    });
    return {
      results: [
        createOtherResult({
          total: result.total,
          page: result.page,
          perPage: result.perPage,
          items: result.items.map(trimFindingEntry),
        }),
      ],
    };
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';

const alertsSchema = z.object({
  query: z
    .string()
    .describe('A natural language query expressing the search request for security alerts'),
  index: z
    .string()
    .optional()
    .describe(
      'Specific alerts index to search against. If not provided, will search against the .alerts-security.alerts-* wildcard pattern (use the wildcard form, NOT the per-space alias .alerts-security.alerts-<space>, which ES|QL cannot resolve).'
    ),
  isCount: z
    .boolean()
    .optional()
    .describe(
      'Set to true when the user is asking for a count of alerts (e.g., "how many alerts", "count alerts", "total number of alerts"). When true, the query will be optimized to return a count result instead of individual alert documents.'
    ),
});

export const SECURITY_ALERTS_TOOL_ID = securityTool('alerts');

/**
 * Wildcard pattern that targets ALL backing indices behind the
 * security alerts alias. Using the wildcard form (rather than the
 * alias `${DEFAULT_ALERTS_INDEX}-${spaceId}`) is load-bearing for two
 * reasons:
 *
 * 1. **ES|QL cannot resolve aliases as data sources.** Quoting
 *    `FROM .alerts-security.alerts-default` against ES|QL fails with
 *    `Unknown data source ".alerts-security.alerts-default"` even
 *    though the alias resolves cleanly via `_search`. The wildcard
 *    pattern resolves to the underlying `.internal.alerts-*` indices
 *    that ES|QL CAN read. (See REPORT_ITER3.md for the empirical
 *    trace evidence — alias-form FROM clauses produced
 *    `Unknown data source` errors on 4/5 reps.)
 *
 * 2. **Cross-space safety.** The alerts alias is per-space; using the
 *     wildcard avoids the alerts tool unintentionally returning
 *     results from a different space than the caller's. RBAC at the
 *     security-solution layer scopes the underlying indices the
 *     calling user can actually read.
 *
 * Combined with `allowPatternTarget: true` on `runSearchTool`, this
 * pattern bypasses the search-tool dispatcher's per-call LLM index
 * selection entirely — saving an LLM round-trip and removing
 * non-determinism in the FROM-clause output.
 */
const ALERTS_INDEX_PATTERN = `${DEFAULT_ALERTS_INDEX}-*` as const;

/**
 * Checks if the given index is a security alerts index
 */
const isAlertsIndex = (index: string): boolean => {
  return index.includes(DEFAULT_ALERTS_INDEX) || index.startsWith('.alerts-security.alerts');
};

/**
 * Static, prompt-cacheable guidance the search subgraph injects via its
 * `## Additional Instructions` section (see search/prompts.ts). Building these
 * strings once at module load — instead of concatenating them onto every
 * user-supplied NL query — keeps the per-call NL query clean (so the
 * conversation history doesn't bloat with ~3KB of boilerplate per tool call)
 * and lets the upstream prompt cache hit on the static prefix across calls.
 */
const ALERTS_FIELDS_LIST = ESSENTIAL_ALERT_FIELDS.map((field) => `\`${field}\``).join(', ');

const ALERTS_KEEP_INSTRUCTION = `When generating ES|QL queries against the security alerts index, you MUST include a KEEP clause limited to these essential fields: ${ALERTS_FIELDS_LIST}. This reduces context window usage by filtering out unnecessary nested data like DLL lists, call stacks, and memory regions. Add the KEEP clause before any LIMIT clause, or at the end if there's no LIMIT. Always preserve the leading dot in the FROM clause AND target the wildcard pattern (e.g. FROM .alerts-security.alerts-*). Do not target the per-space alias FROM .alerts-security.alerts-<space>; ES|QL cannot resolve that alias as a data source.`;

const ALERTS_COUNT_INSTRUCTION = `This is a count query. Generate an ES|QL query that returns ONLY a count result, not individual document rows. Use STATS count = COUNT(*) to return a single number. If grouping is needed (e.g., "count by severity"), use STATS count = COUNT(*) BY <field> but ensure the result is aggregated counts, not individual document rows. Do NOT include a LIMIT clause for count queries unless grouping is used.`;

const buildAlertsCustomInstructions = (index: string, isCount?: boolean): string | undefined => {
  if (!isAlertsIndex(index)) {
    return undefined;
  }
  return isCount
    ? `${ALERTS_KEEP_INSTRUCTION}\n\n${ALERTS_COUNT_INSTRUCTION}`
    : ALERTS_KEEP_INSTRUCTION;
};

export const alertsTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof alertsSchema> => {
  return {
    id: SECURITY_ALERTS_TOOL_ID,
    type: ToolType.builtin,
    description: `Search and analyze security alerts using full-text or structured queries for finding, counting, aggregating, or summarizing alerts. When the user asks for a count (e.g., "how many alerts", "count alerts", "total number of alerts"), set the isCount parameter to true to optimize the query for count results.`,
    schema: alertsSchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) => {
        return getAgentBuilderResourceAvailability({ core, request, logger });
      },
    },
    handler: async (
      { query: nlQuery, index, isCount },
      { esClient, modelProvider, spaceId: _spaceId, events }
    ) => {
      const searchIndex = index ?? ALERTS_INDEX_PATTERN;

      const customInstructions = buildAlertsCustomInstructions(searchIndex, isCount);

      logger.debug(
        `alerts tool called with query: ${nlQuery}, index: ${searchIndex}, isCount: ${
          isCount ?? false
        }`
      );
      const results = await runSearchTool({
        nlQuery,
        index: searchIndex,
        // The default index `${DEFAULT_ALERTS_INDEX}-*` is an index pattern,
        // not a single concrete index. Allow the search subgraph to honor
        // the pattern verbatim (skipping its per-call index-explorer LLM)
        // so ES|QL receives the wildcard form it can actually resolve.
        allowPatternTarget: true,
        customInstructions,
        esClient: esClient.asCurrentUser,
        model: await modelProvider.getDefaultModel(),
        events,
        logger,
      });

      return { results };
    },
    tags: ['security', 'alerts'],
  };
};

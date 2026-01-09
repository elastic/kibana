/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { Logger } from '@kbn/logging';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { DEFAULT_ALERTS_INDEX, ESSENTIAL_ALERT_FIELDS } from '../../../common/constants';
import { getSpaceIdFromRequest } from './helpers';
import { securityTool } from './constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../plugin_contract';
import { otherResult } from '@kbn/onechat-genai-utils/tools/utils/results';
import {
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_STATUS_UPDATED_AT,
  ALERT_WORKFLOW_USER,
} from '@kbn/rule-data-utils';

const MAX_ALERT_IDS = 1000;

const searchSchema = z
  .object({
    query: z
      .string()
      .describe('A natural language query expressing the search request for security alerts'),
    index: z
      .string()
      .optional()
      .describe(
        'Specific alerts index to search against. If not provided, will search against .alerts-security.alerts-* pattern.'
      ),
    isCount: z
      .boolean()
      .optional()
      .describe(
        'Set to true when the user is asking for a count of alerts (e.g., "how many alerts", "count alerts", "total number of alerts"). When true, the query will be optimized to return a count result instead of individual alert documents.'
      ),
  })
  .passthrough();

const setWorkflowStatusSchema = z
  .object({
    operation: z
      .literal('set_workflow_status')
      .describe('Set kibana.alert.workflow_status for one or more alerts (write). Requires confirm: true.'),
    alertIds: z
      .array(z.string().min(1))
      .min(1)
      .max(MAX_ALERT_IDS)
      .describe('List of alert ids/uuids to update.'),
    status: z
      .enum(['open', 'acknowledged', 'closed'])
      .describe('Target workflow status to set on the alert(s).'),
    reason: z
      .string()
      .optional()
      .describe('Optional reason for closing alerts (only used when status="closed").'),
    index: z
      .string()
      .optional()
      .describe(
        'Optional alerts index to update. If not provided, uses the current-space alerts index.'
      ),
    confirm: z.boolean().describe('REQUIRED. Must be true to perform this write operation.'),
    confirmReason: z
      .string()
      .optional()
      .describe('Optional reason why this update is necessary (for audit/traceability).'),
  })
  .passthrough();

const acknowledgeSchema = z
  .object({
    operation: z
      .literal('acknowledge')
      .describe('Convenience operation to set kibana.alert.workflow_status="acknowledged" (write). Requires confirm: true.'),
    alertIds: z
      .array(z.string().min(1))
      .min(1)
      .max(MAX_ALERT_IDS)
      .describe('List of alert ids/uuids to acknowledge.'),
    index: z
      .string()
      .optional()
      .describe(
        'Optional alerts index to update. If not provided, uses the current-space alerts index.'
      ),
    confirm: z.boolean().describe('REQUIRED. Must be true to perform this write operation.'),
    confirmReason: z
      .string()
      .optional()
      .describe('Optional reason why this update is necessary (for audit/traceability).'),
  })
  .passthrough();

// Backwards compatible:
// - { query, ... } is treated as search
// - { operation: "set_workflow_status" | "acknowledge", ... } is treated as write
const alertsSchema = z.union([searchSchema, setWorkflowStatusSchema, acknowledgeSchema]);

export const SECURITY_ALERTS_TOOL_ID = securityTool('alerts');

type ParsedTimeRange = { gte: string; lte: string };
type ParsedStructuredQuery = {
  hosts: string[];
  users: string[];
  hashes: Array<{ value: string; alg: 'md5' | 'sha1' | 'sha256' }>;
  timeRange?: ParsedTimeRange;
};

const extractAlertIdLookup = (nlQuery: string): string | undefined => {
  // Detect "get alert by id" intent and avoid misclassifying the id as a file hash.
  // We intentionally require "alert" + "id" language and also exclude obvious file-hash phrasing.
  const hasIntent = /\balert\b/i.test(nlQuery) && /\bid\b/i.test(nlQuery);
  const looksLikeFileHash = /\bfile\s+hash\b/i.test(nlQuery);
  if (!hasIntent || looksLikeFileHash) return undefined;

  const m = nlQuery.match(/\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/i);
  return m?.[1]?.toLowerCase();
};

const parseTimeRange = (nlQuery: string): ParsedTimeRange | undefined => {
  // Examples: "last 7 days", "in the last 24 hours", "last 2 weeks"
  const m = nlQuery.match(/\b(?:in\s+the\s+)?last\s+(\d+)\s+(day|days|hour|hours|week|weeks)\b/i);
  if (!m) return undefined;

  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (!Number.isFinite(n) || n <= 0) return undefined;

  const suffix = unit.startsWith('hour') ? 'h' : unit.startsWith('week') ? 'w' : 'd';
  return { gte: `now-${n}${suffix}`, lte: 'now' };
};

const parseStructuredAlertQuery = (nlQuery: string): ParsedStructuredQuery | undefined => {
  const hosts: string[] = [];
  const users: string[] = [];
  const hashes: ParsedStructuredQuery['hashes'] = [];

  // Host extraction (very conservative)
  const hostMatches = nlQuery.matchAll(/\bhost(?:\.name)?\s+(?:is\s+)?["']?([A-Za-z0-9._-]+)["']?/gi);
  for (const m of hostMatches) {
    if (m[1]) hosts.push(m[1]);
  }

  // User extraction (very conservative)
  const userMatches = nlQuery.matchAll(/\buser(?:\.name)?\s+(?:is\s+)?["']?([A-Za-z0-9._-]+)["']?/gi);
  for (const m of userMatches) {
    if (m[1]) users.push(m[1]);
  }

  // Hash extraction (md5/sha1/sha256)
  const hashMatches = nlQuery.matchAll(/\b([a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})\b/gi);
  for (const m of hashMatches) {
    const value = m[1]?.toLowerCase();
    if (!value) continue;
    const alg = value.length === 32 ? 'md5' : value.length === 40 ? 'sha1' : 'sha256';
    hashes.push({ value, alg });
  }

  if (hosts.length === 0 && users.length === 0 && hashes.length === 0) return undefined;

  return {
    hosts: Array.from(new Set(hosts)),
    users: Array.from(new Set(users)),
    hashes: hashes.filter(
      (h, idx, arr) => arr.findIndex((x) => x.value === h.value && x.alg === h.alg) === idx
    ),
    timeRange: parseTimeRange(nlQuery),
  };
};

const buildSafeAlertsDslQuery = (parsed: ParsedStructuredQuery) => {
  const should: Array<Record<string, unknown>> = [];

  for (const host of parsed.hosts) {
    should.push({ term: { 'host.name': host } });
  }
  for (const user of parsed.users) {
    should.push({ term: { 'user.name': user } });
  }
  for (const hash of parsed.hashes) {
    const fields = [`file.hash.${hash.alg}`, `process.hash.${hash.alg}`];
    for (const field of fields) {
      should.push({ term: { [field]: hash.value } });
    }
  }

  const filter: Array<Record<string, unknown>> = [];
  if (parsed.timeRange) {
    filter.push({ range: { '@timestamp': parsed.timeRange } });
  }

  return {
    bool: {
      ...(filter.length ? { filter } : {}),
      ...(should.length ? { should, minimum_should_match: 1 } : {}),
    },
  };
};

/**
 * Checks if the given index is a security alerts index
 */
const isAlertsIndex = (index: string): boolean => {
  return index.includes(DEFAULT_ALERTS_INDEX) || index.startsWith('.alerts-security.alerts');
};

/**
 * Enhances the natural language query with instructions to use KEEP clause for alert searches.
 * This ensures the LLM generates ES|QL queries that filter to only essential fields.
 * Additionally, for count queries, ensures optimal count query generation.
 */
const enhanceQueryForAlerts = (nlQuery: string, index: string, isCount?: boolean): string => {
  if (!isAlertsIndex(index)) {
    return nlQuery;
  }

  const fieldsList = ESSENTIAL_ALERT_FIELDS.map((field) => `\`${field}\``).join(', ');
  let instruction = ` IMPORTANT: When generating ES|QL queries, you MUST include a KEEP clause to limit results to only these essential fields: ${fieldsList}. This reduces context window usage by filtering out unnecessary nested data like DLL lists, call stacks, and memory regions. Add the KEEP clause before any LIMIT clause, or at the end if there's no LIMIT.`;

  // For count queries, add specific instructions to ensure optimal count query generation
  if (isCount) {
    instruction += ` CRITICAL: This is a count query. You MUST generate an ES|QL query that returns ONLY a count result, not individual document rows. Use STATS count = COUNT(*) to return a single number. If grouping is needed (e.g., "count by severity"), use STATS count = COUNT(*) BY [field] but ensure the result is aggregated counts, not individual document rows. Do NOT include a LIMIT clause for count queries unless grouping is used.`;
  }

  return `${nlQuery}${instruction}`;
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
      params,
      { request, esClient, modelProvider, events }
    ) => {
      const asAny = params as any;

      // Determine the index to use: either explicitly provided or based on the current space
      const searchIndex =
        asAny?.index ?? `${DEFAULT_ALERTS_INDEX}-${getSpaceIdFromRequest(request)}`;

      // WRITE: set workflow status / acknowledge
      if (asAny?.operation === 'set_workflow_status' || asAny?.operation === 'acknowledge') {
        const confirm = asAny?.confirm;
        if (confirm !== true) {
          return {
            results: [
              otherResult({
                operation: asAny?.operation,
                index: searchIndex,
                raw: {
                  error: {
                    message:
                      'This operation updates alert documents. Ask for explicit user confirmation and pass confirm: true.',
                  },
                },
              }),
            ],
          };
        }

        const status = asAny?.operation === 'acknowledge' ? 'acknowledged' : asAny?.status;
        const alertIds: string[] = Array.isArray(asAny?.alertIds) ? asAny.alertIds : [];
        const reason: string | undefined = status === 'closed' ? asAny?.reason : undefined;

        const updatedAt = new Date().toISOString();
        const scriptReason = status === 'closed' ? reason ?? null : null;

        const raw = await esClient.asCurrentUser.updateByQuery({
          index: searchIndex,
          refresh: true,
          conflicts: 'proceed',
          ignore_unavailable: true,
          script: {
            source: `
              ctx._source['${ALERT_WORKFLOW_STATUS}'] = params.status;
              ctx._source['${ALERT_WORKFLOW_USER}'] = params.user;
              ctx._source['${ALERT_WORKFLOW_STATUS_UPDATED_AT}'] = params.updatedAt;
              if (params.reason != null) {
                ctx._source['${ALERT_WORKFLOW_REASON}'] = params.reason;
              } else {
                ctx._source.remove('${ALERT_WORKFLOW_REASON}');
              }
              if (ctx._source.signal != null && ctx._source.signal.status != null) {
                ctx._source.signal.status = params.status;
              }
            `,
            lang: 'painless',
            params: {
              status,
              updatedAt,
              user: null,
              reason: scriptReason,
            },
          },
          query: {
            bool: {
              should: [
                { terms: { _id: alertIds } },
                { terms: { 'kibana.alert.uuid': alertIds } },
                { terms: { 'kibana.alert.id': alertIds } },
              ],
              minimum_should_match: 1,
            },
          } as any,
        });

        return {
          results: [
            otherResult({
              operation: asAny?.operation,
              index: searchIndex,
              raw: {
                status,
                alertIds,
                response: raw,
              },
            }),
          ],
        };
      }

      // READ: search
      const nlQuery = asAny?.query;
      const isCount = asAny?.isCount;

      // If the query looks like a "get alert by id" request, do a deterministic lookup first.
      // This avoids treating the id as a file hash and building the wrong structured query.
      const alertId = extractAlertIdLookup(nlQuery);
      if (alertId && isAlertsIndex(searchIndex)) {
        const raw = await esClient.asCurrentUser.search({
          index: searchIndex,
          track_total_hits: true,
          size: 1,
          sort: [{ '@timestamp': 'desc' }],
          query: {
            bool: {
              should: [
                { ids: { values: [alertId] } },
                { term: { 'kibana.alert.uuid': alertId } },
                { term: { 'kibana.alert.id': alertId } },
              ],
              minimum_should_match: 1,
            },
          } as any,
          _source: ESSENTIAL_ALERT_FIELDS as any,
        });

        return {
          results: [
            otherResult({
              operation: 'search',
              index: searchIndex,
              isCount: false,
              raw: { strategy: 'get_by_id', alertId, response: raw },
            }),
          ],
        };
      }

      // If the query contains strongly-structured constraints (host/user/hash/time range), run a deterministic,
      // well-formed DSL query directly. This avoids occasional LLM-generated query DSL failures such as
      // `field name is null or empty`.
      const parsed = parseStructuredAlertQuery(nlQuery);
      if (parsed && isAlertsIndex(searchIndex)) {
        const dslQuery = buildSafeAlertsDslQuery(parsed);
        const size = isCount ? 0 : 50;
        const raw = await esClient.asCurrentUser.search({
          index: searchIndex,
          query: dslQuery as any,
          track_total_hits: true,
          size,
          ...(size > 0 ? { sort: [{ '@timestamp': 'desc' }] } : {}),
          _source: ESSENTIAL_ALERT_FIELDS as any,
        });

        return {
          results: [
            otherResult({
              operation: 'search',
              index: searchIndex,
              isCount: isCount ?? false,
              raw: { strategy: 'fallback_dsl', parsed, response: raw },
            }),
          ],
        };
      }

      // Enhance the query with KEEP clause instructions if searching alerts index
      const enhancedQuery = enhanceQueryForAlerts(nlQuery, searchIndex, isCount);

      logger.debug(
        `alerts tool called with query: ${nlQuery}, index: ${searchIndex}, isCount: ${isCount ?? false
        }`
      );
      const results = await runSearchTool({
        nlQuery: enhancedQuery,
        index: searchIndex,
        esClient: esClient.asCurrentUser,
        model: await modelProvider.getDefaultModel(),
        events,
        logger,
      });

      return {
        results: [
          otherResult({
            operation: 'search',
            index: searchIndex,
            isCount: isCount ?? false,
            raw: results,
          }),
        ],
      };
    },
    tags: ['security', 'alerts'],
  };
};

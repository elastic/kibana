/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup, ToolHandlerContext } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { RUM_REPORT_TEMPLATE_IDS, maskDisplayUser } from '../../common/rum_report';
import { RUM_UX_TOOL_IDS } from '../../common/rum_agent';
import {
  buildRumReport,
  fetchErrors,
  fetchOverview,
  fetchPages,
  fetchSessions,
} from '../routes/rum/reports';
import type { UxRouteHandlerResources } from '../routes/types';
import { createUxRouteResources } from './resources';

const scopeSchema = {
  start: z
    .string()
    .max(64)
    .default('now-24h')
    .describe('Elasticsearch date math start, e.g. now-24h or an ISO timestamp.'),
  end: z
    .string()
    .max(64)
    .default('now')
    .describe('Elasticsearch date math end, e.g. now or an ISO timestamp.'),
  serviceName: z.string().max(256).optional().describe('RUM service.name filter.'),
  browser: z.string().max(128).optional(),
  os: z.string().max(128).optional(),
  location: z.string().max(8).optional().describe('ISO-3166 alpha-2 country code.'),
  pageUrl: z.string().max(512).optional(),
  user: z.string().max(256).optional(),
  kuery: z.string().max(4096).optional().describe('KQL filter over RUM documents.'),
};

const toListQuery = (params: {
  start: string;
  end: string;
  serviceName?: string;
  browser?: string;
  os?: string;
  location?: string;
  pageUrl?: string;
  user?: string;
  kuery?: string;
}) => ({
  rangeFrom: params.start,
  rangeTo: params.end,
  serviceName: params.serviceName,
  browser: params.browser,
  os: params.os,
  location: params.location,
  pageUrl: params.pageUrl,
  user: params.user,
  kuery: params.kuery,
});

const failed = (error: unknown, log: Logger) => {
  const message = error instanceof Error ? error.message : String(error);
  log.error(message);
  return {
    results: [createErrorResult(message)],
  };
};

const readOnlyAnnotations = (title: string) => ({
  title,
  readOnlyHint: true as const,
  destructiveHint: false as const,
  idempotentHint: true as const,
  openWorldHint: false as const,
});

export const registerRumTools = ({
  agentBuilder,
  core,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  core: CoreSetup;
  logger: Logger;
}): void => {
  const resourcesOf = (context: ToolHandlerContext): UxRouteHandlerResources =>
    createUxRouteResources({
      core,
      esClient: context.esClient,
      request: context.request,
      logger: context.logger,
    });

  agentBuilder.tools.register({
    id: RUM_UX_TOOL_IDS.getOverview,
    type: ToolType.builtin,
    annotations: readOnlyAnnotations('Get RUM overview'),
    description: `Retrieves RUM overview KPIs, Core Web Vitals, countries, browsers, OS, frustration counts, and top pages.

When to use:
- Starting an investigation for a time range
- Comparing volume, error rate, LCP, or geo mix
- Answering "where is the site slow" at country level

When NOT to use:
- Listing individual sessions — use ${RUM_UX_TOOL_IDS.findSessions}
- Building a full stakeholder report — use ${RUM_UX_TOOL_IDS.getReport}`,
    schema: z.object(scopeSchema),
    tags: ['observability', 'rum'],
    handler: async (params, context) => {
      try {
        const data = await fetchOverview(resourcesOf(context), toListQuery(params));
        return { results: [createOtherResult(data)] };
      } catch (error) {
        return failed(error, context.logger);
      }
    },
  });

  agentBuilder.tools.register({
    id: RUM_UX_TOOL_IDS.findSessions,
    type: ToolType.builtin,
    annotations: readOnlyAnnotations('Find RUM sessions'),
    description: `Finds RUM sessions matching filters, sorted by duration, errors, or rage clicks.

When to use:
- Find slow users (sortField=durationMs)
- Who is facing errors (hasErrors=true)
- Frustration hotspots (hasRage=true)
- Bounced visits (hasBounced=true)

Returns a compact session list with IDs that can be opened in Session Replay.`,
    schema: z.object({
      ...scopeSchema,
      hasErrors: z.boolean().optional().describe('When true, only sessions that recorded errors.'),
      hasRage: z.boolean().optional().describe('When true, only sessions with rage clicks.'),
      hasBounced: z
        .boolean()
        .optional()
        .describe('When true, only bounced sessions (exactly one page view).'),
      minDurationMs: z.number().int().min(0).max(3_600_000).optional(),
      sortField: z
        .enum(['startTime', 'durationMs', 'errorCount', 'rageClickCount'])
        .default('durationMs'),
      sortDirection: z.enum(['asc', 'desc']).default('desc'),
      includePii: z.boolean().default(false),
      limit: z.number().int().min(1).max(50).default(15),
    }),
    tags: ['observability', 'rum', 'sessions'],
    handler: async (params, context) => {
      try {
        const result = await fetchSessions(resourcesOf(context), {
          ...toListQuery(params),
          hasErrors: params.hasErrors ? 'true' : undefined,
          hasRage: params.hasRage ? 'true' : undefined,
          hasBounced: params.hasBounced ? 'true' : undefined,
          minDurationMs: params.minDurationMs != null ? String(params.minDurationMs) : undefined,
          sortField: params.sortField,
          sortDirection: params.sortDirection,
          perPage: String(params.limit),
          page: '0',
        });
        return {
          results: [
            createOtherResult({
              total: result.total,
              stats: result.stats,
              sessions: result.sessions.slice(0, params.limit).map((session) => ({
                sessionId: session.sessionId,
                startTime: session.startTime,
                durationMs: session.durationMs,
                errorCount: session.errorCount,
                rageClickCount: session.rageClickCount,
                pageCount: session.pageCount,
                entryPage: session.entryPage,
                exitPage: session.exitPage,
                displayUser: maskDisplayUser(session.user, params.includePii),
                browser: session.client.browser,
                os: session.client.os,
                country: session.client.country,
                countryIso: session.client.countryIso,
                hasReplay: session.hasReplay,
              })),
            }),
          ],
        };
      } catch (error) {
        return failed(error, context.logger);
      }
    },
  });

  agentBuilder.tools.register({
    id: RUM_UX_TOOL_IDS.getErrors,
    type: ToolType.builtin,
    annotations: readOnlyAnnotations('Get RUM errors'),
    description: `Retrieves RUM exception groups ranked by impact (count, sessions, identified users).

When to use:
- Who is hitting errors
- Which error group to investigate in Session Replay

When NOT to use:
- Listing the sessions behind a group — use ${RUM_UX_TOOL_IDS.findSessions} with hasErrors=true`,
    schema: z.object(scopeSchema),
    tags: ['observability', 'rum', 'errors'],
    handler: async (params, context) => {
      try {
        const data = await fetchErrors(resourcesOf(context), toListQuery(params));
        return { results: [createOtherResult(data)] };
      } catch (error) {
        return failed(error, context.logger);
      }
    },
  });

  agentBuilder.tools.register({
    id: RUM_UX_TOOL_IDS.getPages,
    type: ToolType.builtin,
    annotations: readOnlyAnnotations('Get RUM pages'),
    description: `Retrieves per-page RUM views and Core Web Vitals (LCP, INP, CLS) plus error counts.

When to use:
- Where the website is slow
- Ranking routes by poor LCP weighted by views`,
    schema: z.object(scopeSchema),
    tags: ['observability', 'rum', 'pages'],
    handler: async (params, context) => {
      try {
        const data = await fetchPages(resourcesOf(context), toListQuery(params));
        return { results: [createOtherResult(data)] };
      } catch (error) {
        return failed(error, context.logger);
      }
    },
  });

  agentBuilder.tools.register({
    id: RUM_UX_TOOL_IDS.getReport,
    type: ToolType.builtin,
    annotations: readOnlyAnnotations('Get RUM report'),
    description: `Builds a full RUM report for a template (scorecard, pages, errors, frustration, funnel, clients, users), including period-over-period deltas when compare=previous.

When to use:
- Stakeholder / weekly reporting
- Compare this range to the previous equal-length window

When NOT to use:
- Quick KPI lookup — use ${RUM_UX_TOOL_IDS.getOverview}`,
    schema: z.object({
      ...scopeSchema,
      templateId: z
        .enum(RUM_REPORT_TEMPLATE_IDS)
        .describe(
          'Report template: scorecard, pages, errors, frustration, funnel, clients, users.'
        ),
      compare: z.enum(['previous', 'none']).default('previous'),
      includePii: z.boolean().default(false),
    }),
    tags: ['observability', 'rum', 'reports'],
    handler: async (params, context) => {
      try {
        const data = await buildRumReport(params.templateId, resourcesOf(context), {
          ...toListQuery(params),
          compare: params.compare,
          includePii: params.includePii ? 'true' : undefined,
        });
        return { results: [createOtherResult(data)] };
      } catch (error) {
        return failed(error, context.logger);
      }
    },
  });
};

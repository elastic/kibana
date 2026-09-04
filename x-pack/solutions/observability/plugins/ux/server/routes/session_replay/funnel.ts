/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import {
  computeFunnel,
  FUNNEL_MAX_STEPS,
  FUNNEL_MIN_STEPS,
  FUNNEL_STEP_LABEL_MAX_LENGTH,
  FUNNEL_STEP_VALUE_MAX_LENGTH,
  type FunnelStepDef,
  type SessionFunnelResponse,
} from '../../../common/session_funnel';
import { SESSION_ID_SCRIPT } from './list_sessions';
import { activitySearchTokens } from './session_attributes';
import { kueryFilters } from '../rum/kuery';
import { resolveRumAnalytics } from '../../transforms/rum_sessions';
import { mergeFunnelResponses, querySessionIndexFunnel } from '../../transforms/rum_sessions_query';
import { resolveNewTailSessionIds } from '../../transforms/rum_sessions_tail';
import { sessionIdTermsFilter } from '../../../common/session_find';
import { getRumSearchClient } from '../../lib/rum_search_client';

const boundedString = (max: number) =>
  new t.Type<string, string, unknown>(
    `BoundedString(${max})`,
    (u): u is string => typeof u === 'string',
    (u, c) => (typeof u === 'string' && u.length <= max ? t.success(u) : t.failure(u, c)),
    t.identity
  );

const funnelStepCodec = t.intersection([
  t.type({
    type: t.union([t.literal('page'), t.literal('activity')]),
    value: boundedString(FUNNEL_STEP_VALUE_MAX_LENGTH),
  }),
  t.partial({
    label: boundedString(FUNNEL_STEP_LABEL_MAX_LENGTH),
  }),
]);

const funnelStepsCodec = new t.Type<FunnelStepDef[], FunnelStepDef[], unknown>(
  'FunnelSteps',
  (u): u is FunnelStepDef[] => Array.isArray(u) && u.length <= FUNNEL_MAX_STEPS,
  (u, c) => {
    if (!Array.isArray(u) || u.length > FUNNEL_MAX_STEPS) {
      return t.failure(u, c);
    }
    return t.array(funnelStepCodec).validate(u, c);
  },
  t.identity
);

const luceneEscape = (raw: string): string => raw.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, '\\$&');

const stepQuery = (step: FunnelStepDef): Record<string, unknown> => {
  const needle = luceneEscape(step.value.trim().replace(/[*?]/g, '')).slice(
    0,
    FUNNEL_STEP_VALUE_MAX_LENGTH
  );
  if (!needle) {
    return { match_none: {} };
  }

  if (step.type === 'page') {
    return {
      query_string: {
        query: `*${needle}*`,
        fields: [
          'attributes.url.full',
          'attributes.page.url.path',
          'attributes.page.url',
          'attributes.http.url',
          'url.full',
          'page.url.path',
          'page.url',
          'http.url',
        ],
        lenient: true,
        analyze_wildcard: true,
      },
    };
  }

  const tokens = activitySearchTokens(step.value).map((token) =>
    luceneEscape(token.replace(/[*?]/g, ''))
  );
  return {
    bool: {
      filter: [
        {
          bool: {
            should: [{ term: { name: 'click' } }, { term: { event_name: 'click' } }],
            minimum_should_match: 1,
          },
        },
      ],
      should: tokens.map((token) => ({
        query_string: {
          query: `*${token}*`,
          fields: ['attributes.target_xpath'],
          lenient: true,
          analyze_wildcard: true,
        },
      })),
      minimum_should_match: 1,
    },
  };
};

interface StepMinAgg {
  doc_count?: number;
  first?: { value?: number | null };
}

export const queryRawFunnel = async ({
  client,
  rangeFrom,
  rangeTo,
  serviceName,
  kuery,
  steps,
  sessionIds,
}: {
  client: ElasticsearchClient;
  rangeFrom: string;
  rangeTo: string;
  serviceName?: string;
  kuery?: string;
  steps: FunnelStepDef[];
  sessionIds?: string[];
}): Promise<SessionFunnelResponse> => {
  if (sessionIds && sessionIds.length === 0) {
    return { sessionsConsidered: 0, steps: [] };
  }
  const timeFilter = { range: { '@timestamp': { gte: rangeFrom, lte: rangeTo } } };
  const serviceFilters = serviceName
    ? [
        {
          bool: {
            should: [
              { term: { 'resource.attributes.service.name': serviceName } },
              { term: { 'attributes.service.name': serviceName } },
            ],
            minimum_should_match: 1,
          },
        },
      ]
    : [];
  const idFilters = sessionIds && sessionIds.length > 0 ? [sessionIdTermsFilter(sessionIds)] : [];

  const stepAggs = Object.fromEntries(
    steps.map((step, i) => [
      `step_${i}`,
      {
        filter: stepQuery(step),
        aggs: { first: { min: { field: '@timestamp' } } },
      },
    ])
  );

  const result = await client.search({
    index: RUM_SESSION_SOURCE_INDEX,
    ignore_unavailable: true,
    allow_no_indices: true,
    size: 0,
    query: {
      bool: {
        filter: [timeFilter, ...serviceFilters, ...kueryFilters(kuery), ...idFilters],
      },
    },
    aggs: {
      sessions: {
        terms: {
          script: { source: SESSION_ID_SCRIPT, lang: 'painless' },
          size: 500,
        },
        aggs: stepAggs,
      },
    },
  });

  const buckets =
    (
      result.aggregations as {
        sessions?: { buckets?: Array<Record<string, unknown> & { key?: string }> };
      }
    )?.sessions?.buckets ?? [];

  const sessions = buckets
    .filter((bucket) => Boolean(bucket.key))
    .map((bucket) => ({
      sessionId: String(bucket.key),
      firstTs: steps.map((_, i) => {
        const agg = bucket[`step_${i}`] as StepMinAgg | undefined;
        const value = agg?.first?.value;
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
      }),
    }));

  return computeFunnel(sessions, steps);
};

export const getSessionFunnelRoute = createUxServerRoute({
  endpoint: 'POST /internal/ux/session_replay/funnel',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    body: t.intersection([
      t.type({
        rangeFrom: boundedString(64),
        rangeTo: boundedString(64),
        steps: funnelStepsCodec,
      }),
      t.partial({
        serviceName: boundedString(256),
        kuery: boundedString(4096),
        includeRaw: t.union([t.boolean, t.string]),
        analyticsMode: boundedString(16),
      }),
    ]),
  }),
  handler: async ({ context, core, params, request }): Promise<SessionFunnelResponse> => {
    const { rangeFrom, rangeTo, serviceName, kuery, analyticsMode } = params.body;
    const steps = params.body.steps
      .map((step) => ({
        ...step,
        value: step.value.trim(),
        label: step.label?.trim() || undefined,
      }))
      .filter((step) => step.value.length > 0)
      .slice(0, FUNNEL_MAX_STEPS);

    if (steps.length < FUNNEL_MIN_STEPS) {
      return { sessionsConsidered: 0, steps: [] };
    }

    const { elasticsearch } = await context.core;
    const client = await getRumSearchClient({ context, core, request });
    const analytics = await resolveRumAnalytics(elasticsearch.client.asInternalUser, {
      analyticsMode,
      rangeTo,
    });

    if (!analytics.useIndex) {
      return queryRawFunnel({ client, rangeFrom, rangeTo, serviceName, kuery, steps });
    }

    const settled = await querySessionIndexFunnel({
      client,
      rangeFrom,
      rangeTo,
      serviceName,
      steps,
      watermark: analytics.status.watermark ?? undefined,
    });
    if (!analytics.mergeRaw || !analytics.status.watermark) {
      return settled;
    }
    const newIds = await resolveNewTailSessionIds({
      client,
      rangeFrom: analytics.status.watermark,
      rangeTo,
      serviceName,
      kuery,
    });
    if (newIds.length === 0) {
      return settled;
    }
    const live = await queryRawFunnel({
      client,
      rangeFrom: analytics.status.watermark,
      rangeTo,
      serviceName,
      kuery,
      steps,
      sessionIds: newIds,
    });
    return mergeFunnelResponses(settled, live);
  },
});

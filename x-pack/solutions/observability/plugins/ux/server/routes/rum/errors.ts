/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import { RUM_SESSION_SOURCE_INDEX } from '../../../common/session_replay';
import {
  makeErrorGroupKey,
  type RumErrorGroup,
  type RumErrorsResponse,
} from '../../../common/rum_app';
import { SAMPLE_SOURCE } from '../session_replay/list_sessions';
import {
  attrString,
  errorGroupFromHit,
  pageFromHit,
  traceIdFromHit,
  type OtelHit,
} from '../session_replay/session_attributes';
import { rumEsSearchOptions } from './es_retry';
import {
  EXCEPTION_FILTER,
  identifiedUsers,
  rumBaseFilters,
  rumListQueryCodec,
  sessionCardinality,
  termsBuckets,
} from './query';

const ERROR_GROUP_SCRIPT = `
  try {
    def type = '';
    if (doc.containsKey('attributes.exception.type') && doc['attributes.exception.type'].size() > 0) {
      type = doc['attributes.exception.type'].value.toString();
    } else if (doc.containsKey('attributes.error.type') && doc['attributes.error.type'].size() > 0) {
      type = doc['attributes.error.type'].value.toString();
    }
    if (type.length() == 0) { type = 'Error'; }
    if (type.length() > 80) { type = type.substring(0, 80); }
    def msg = '';
    if (doc.containsKey('attributes.exception.message') && doc['attributes.exception.message'].size() > 0) {
      msg = doc['attributes.exception.message'].value.toString();
    } else if (doc.containsKey('attributes.error.message') && doc['attributes.error.message'].size() > 0) {
      msg = doc['attributes.error.message'].value.toString();
    }
    int nl = msg.indexOf((char)10);
    if (nl >= 0) { msg = msg.substring(0, nl); }
    msg = msg.trim();
    if (msg.length() > 120) { msg = msg.substring(0, 120); }
    return type + '|' + msg;
  } catch (Exception e) {
    return 'Error|';
  }
`;

export const getRumErrorsRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/rum/errors',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({ query: rumListQueryCodec }),
  handler: async ({ context, params }): Promise<RumErrorsResponse> => {
    const { elasticsearch } = await context.core;
    const client = elasticsearch.client.asCurrentUser;

    const result = await client.search(
      {
        index: RUM_SESSION_SOURCE_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 0,
        query: { bool: { filter: [...rumBaseFilters(params.query), EXCEPTION_FILTER] } },
        aggs: {
          groups: {
            terms: {
              script: { source: ERROR_GROUP_SCRIPT, lang: 'painless' },
              size: 50,
            },
            aggs: {
              sessions: sessionCardinality,
              users: identifiedUsers,
              trend: {
                auto_date_histogram: { field: '@timestamp', buckets: 16 },
              },
              sample: {
                top_hits: {
                  size: 1,
                  sort: [{ '@timestamp': 'desc' as const }],
                  _source: SAMPLE_SOURCE,
                },
              },
            },
          },
        },
      },
      rumEsSearchOptions
    );

    const groups: RumErrorGroup[] = termsBuckets(
      (result.aggregations as { groups?: unknown } | undefined)?.groups
    ).map((bucket) => {
      const sampleHit = (bucket.sample as { hits?: { hits?: OtelHit[] } } | undefined)?.hits
        ?.hits?.[0];
      const source = sampleHit?._source ?? {};
      const parsed = errorGroupFromHit(source);
      const type =
        parsed?.type ??
        attrString(source, 'exception.type') ??
        attrString(source, 'error.type') ??
        'Error';
      const message =
        parsed?.message ??
        attrString(source, 'exception.message') ??
        attrString(source, 'error.message') ??
        String(bucket.key);
      const trend = termsBuckets(
        (bucket.trend as { buckets?: unknown } | undefined) ?? bucket.trend
      ).map((point) => point.doc_count);

      return {
        key: String(bucket.key) || makeErrorGroupKey(type, message),
        type,
        message,
        count: bucket.doc_count,
        sessionCount: ((bucket.sessions as { value?: number } | undefined)?.value ?? 0) as number,
        userCount: (bucket.users as { count?: { value?: number } } | undefined)?.count?.value ?? 0,
        sampleStack:
          attrString(source, 'exception.stacktrace') ??
          attrString(source, 'error.stacktrace') ??
          null,
        groupingKey: attrString(source, 'error.grouping_key') ?? attrString(source, 'grouping_key'),
        trend,
        samplePage: pageFromHit(source),
        sampleAction:
          attrString(source, 'user_action.name') ?? attrString(source, 'user_action.id'),
        sampleTraceId: traceIdFromHit(source),
      };
    });

    return {
      groups,
      total: groups.reduce((sum, group) => sum + group.count, 0),
    };
  },
});

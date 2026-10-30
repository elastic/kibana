/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SESSION_SORT_FIELDS, type SessionSortField } from '../../common/sessions';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;

export type DurationBucket = 'under10s' | '10sTo1m' | '1mTo5m' | '5mTo30m' | 'over30m';

/** Session duration ranges to filter by, in display order: `min` inclusive, `max` exclusive. */
export const DURATION_BUCKETS: ReadonlyArray<{
  id: DurationBucket;
  label: string;
  minDurationMs?: number;
  maxDurationMs?: number;
}> = [
  {
    id: 'under10s',
    label: i18n.translate('xpack.digitalExperience.sessions.duration.under10sLabel', {
      defaultMessage: 'Under 10 s',
    }),
    maxDurationMs: 10 * SECOND_MS,
  },
  {
    id: '10sTo1m',
    label: i18n.translate('xpack.digitalExperience.sessions.duration.10sTo1mLabel', {
      defaultMessage: '10 s to 1 min',
    }),
    minDurationMs: 10 * SECOND_MS,
    maxDurationMs: MINUTE_MS,
  },
  {
    id: '1mTo5m',
    label: i18n.translate('xpack.digitalExperience.sessions.duration.1mTo5mLabel', {
      defaultMessage: '1 to 5 min',
    }),
    minDurationMs: MINUTE_MS,
    maxDurationMs: 5 * MINUTE_MS,
  },
  {
    id: '5mTo30m',
    label: i18n.translate('xpack.digitalExperience.sessions.duration.5mTo30mLabel', {
      defaultMessage: '5 to 30 min',
    }),
    minDurationMs: 5 * MINUTE_MS,
    maxDurationMs: 30 * MINUTE_MS,
  },
  {
    id: 'over30m',
    label: i18n.translate('xpack.digitalExperience.sessions.duration.over30mLabel', {
      defaultMessage: '30 min or more',
    }),
    minDurationMs: 30 * MINUTE_MS,
  },
];

const durationBucketRt = t.keyof(
  Object.fromEntries(DURATION_BUCKETS.map(({ id }) => [id, null])) as Record<DurationBucket, null>
);

const sortFieldRt = t.keyof(
  Object.fromEntries(SESSION_SORT_FIELDS.map((field) => [field, null])) as Record<
    SessionSortField,
    null
  >
);

/**
 * The sessions list's state in the URL; the router replaces an invalid value with none (see
 * `routes.tsx`). Paging stays a string, as `useSessionsListQuery` bounds it.
 */
export const sessionsListQueryRt = t.partial({
  search: t.string,
  browser: t.string,
  os: t.string,
  country: t.string,
  entryPage: t.string,
  hasErrors: t.literal('true'),
  duration: durationBucketRt,
  sortField: sortFieldRt,
  sortDirection: t.keyof({ asc: null, desc: null }),
  page: t.string,
  perPage: t.string,
});

export type SessionsListUrlQuery = t.TypeOf<typeof sessionsListQueryRt>;

const SESSIONS_LIST_QUERY_KEYS = [
  'search',
  'browser',
  'os',
  'country',
  'entryPage',
  'hasErrors',
  'duration',
  'sortField',
  'sortDirection',
  'page',
  'perPage',
] as const satisfies ReadonlyArray<keyof SessionsListUrlQuery>;

/** The list's own params in a URL query that also holds the time range and other params. */
export const pickSessionsListQuery = (query: SessionsListUrlQuery): SessionsListUrlQuery =>
  pick(query, SESSIONS_LIST_QUERY_KEYS);

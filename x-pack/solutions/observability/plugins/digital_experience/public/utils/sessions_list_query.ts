/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { NonEmptyString } from '@kbn/io-ts-utils';
import { inRangeFromStringRt, nonEmptyStringRt, toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import {
  SESSION_SORT_FIELDS,
  SESSIONS_LIST_MAX_FACET_LENGTHS,
  SESSIONS_LIST_MAX_PAGE,
  SESSIONS_LIST_MAX_PER_PAGE,
  SESSIONS_LIST_MAX_SEARCH_LENGTH,
  type SessionSortField,
} from '../../common/sessions';

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

export interface MaxLengthBrand {
  readonly MaxLength: unique symbol;
}

/** A non-empty string the list API accepts, at most `maxLength` long. */
const filterValueRt = (maxLength: number) =>
  t.brand(
    nonEmptyStringRt,
    (value): value is t.Branded<NonEmptyString, MaxLengthBrand> => value.length <= maxLength,
    'MaxLength'
  );

/** `toBooleanRt` for a URL param: an unset param stays unset rather than becoming `false`. */
const booleanParamRt = new t.Type<boolean, boolean, unknown>(
  'BooleanParam',
  toBooleanRt.is,
  (input, context) =>
    input === undefined ? t.failure(input, context) : toBooleanRt.validate(input, context),
  toBooleanRt.encode
);

const pageSizeRt = t.union([
  t.literal(10),
  t.literal(25),
  t.literal(50),
  t.literal(SESSIONS_LIST_MAX_PER_PAGE),
]);

/** The table's page sizes. */
export const SESSIONS_PAGE_SIZES = pageSizeRt.types.map(({ value }) => value);

/**
 * The sessions list's state in the URL. The router removes an invalid value (see `routes.tsx`),
 * e.g. an empty filter, a page past the API's last one or a page size the table doesn't offer.
 */
export const sessionsListQueryRt = t.partial({
  search: filterValueRt(SESSIONS_LIST_MAX_SEARCH_LENGTH),
  browser: filterValueRt(SESSIONS_LIST_MAX_FACET_LENGTHS.browser),
  os: filterValueRt(SESSIONS_LIST_MAX_FACET_LENGTHS.os),
  country: filterValueRt(SESSIONS_LIST_MAX_FACET_LENGTHS.country),
  entryPage: filterValueRt(SESSIONS_LIST_MAX_FACET_LENGTHS.entryPage),
  hasErrors: booleanParamRt,
  duration: durationBucketRt,
  sortField: sortFieldRt,
  sortDirection: t.keyof({ asc: null, desc: null }),
  page: inRangeFromStringRt(0, SESSIONS_LIST_MAX_PAGE).pipe(t.Int),
  perPage: toNumberRt.pipe(pageSizeRt),
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

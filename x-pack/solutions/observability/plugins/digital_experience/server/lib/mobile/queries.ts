/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { mobileColumn, resultColumn } from '../../../common/mobile/fields';
import { MAX_ENVIRONMENTS } from '../constants';

/** The most used combinations of the environment fields to read; `toEnvironments` caps the names. */
const MAX_ENVIRONMENT_ROWS = MAX_ENVIRONMENTS * MAX_ENVIRONMENTS;

/** The documents counted per environment, by both environment fields. */
export const withEnvironmentCounts = (query: ComposerQuery): ComposerQuery =>
  query.pipe`STATS ${resultColumn('docs')} = COUNT(*)
      BY ${mobileColumn('environment')}, ${mobileColumn('environmentName')}`
    .pipe`SORT ${resultColumn('docs')} DESC`.pipe`LIMIT ${MAX_ENVIRONMENT_ROWS}`;

/** The OS names to list, at most: Android, iOS and iPadOS today. */
const MAX_OS_ROWS = 100;

/** The sessions per OS name and platform, most first. */
export const withOsCounts = (query: ComposerQuery): ComposerQuery =>
  query.pipe`STATS ${resultColumn('sessions')} = COUNT_DISTINCT(${mobileColumn('sessionId')})
      BY ${resultColumn('osName')} = ${mobileColumn('osName')}, ${resultColumn('platform')}`
    .pipe`SORT ${resultColumn('sessions')} DESC`.pipe`LIMIT ${MAX_OS_ROWS}`;

/** Documents with a release: an empty `service.version` names none. */
const withRelease = (query: ComposerQuery): ComposerQuery =>
  query.pipe`WHERE ${mobileColumn('serviceVersion')} IS NOT NULL AND ${mobileColumn(
    'serviceVersion'
  )} != ""`;

/** The sessions per release, most first (then the higher release), up to `limit`. */
export const withReleaseCounts = (query: ComposerQuery, limit: number): ComposerQuery =>
  withRelease(query).pipe`STATS ${resultColumn('sessions')} = COUNT_DISTINCT(${mobileColumn(
    'sessionId'
  )})
      BY ${resultColumn('release')} = ${mobileColumn('serviceVersion')}`.pipe`SORT ${resultColumn(
    'sessions'
  )} DESC, ${resultColumn('release')} DESC`.pipe`LIMIT ${limit}`;

/**
 * A release the `version` type orders by number, e.g. `1.2` or `2.10.0`: dot-separated numbers
 * without leading zeros, nor a pre-release or build, so no beta beats it and `debug` can't.
 */
export const RELEASE_VERSION_PATTERN = '(0|[1-9][0-9]*)([.](0|[1-9][0-9]*))*';

/**
 * Each application's newest release on any platform, compared as versions so `2.10.0` is after
 * `2.9.0`, one row per application, so no cut on releases can leave one without. Without a
 * numeric release, the one that first showed up last.
 */
export const withLatestReleases = (query: ComposerQuery): ComposerQuery =>
  withRelease(query).pipe`STATS ${resultColumn('firstSeen')} = MIN(@timestamp)
      BY ${mobileColumn('serviceName')}, ${mobileColumn('serviceVersion')}`
    .pipe`EVAL ${resultColumn('numericRelease')} = CASE(
      ${mobileColumn('serviceVersion')} RLIKE ${RELEASE_VERSION_PATTERN},
      TO_VERSION(${mobileColumn('serviceVersion')}),
      NULL
    )`.pipe`STATS ${resultColumn('numericRelease')} = MAX(${resultColumn('numericRelease')}),
      ${resultColumn('newestRelease')} = LAST(${mobileColumn('serviceVersion')}, ${resultColumn(
    'firstSeen'
  )})
      BY ${mobileColumn('serviceName')}`.pipe`EVAL ${resultColumn('latestRelease')} = COALESCE(
      TO_STRING(${resultColumn('numericRelease')}),
      ${resultColumn('newestRelease')}
    )`.pipe`KEEP ${mobileColumn('serviceName')}, ${resultColumn('latestRelease')}`;

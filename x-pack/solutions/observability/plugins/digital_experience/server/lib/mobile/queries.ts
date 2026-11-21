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

/** The sessions per release, most first (then the higher release), up to `limit`. */
export const withReleaseCounts = (query: ComposerQuery, limit: number): ComposerQuery =>
  query.pipe`WHERE ${mobileColumn('serviceVersion')} IS NOT NULL`.pipe`STATS ${resultColumn(
    'sessions'
  )} = COUNT_DISTINCT(${mobileColumn('sessionId')})
      BY ${resultColumn('release')} = ${mobileColumn('serviceVersion')}`.pipe`SORT ${resultColumn(
    'sessions'
  )} DESC, ${resultColumn('release')} DESC`.pipe`LIMIT ${limit}`;

/**
 * Each application's newest release on any platform, compared as versions so `2.10.0` is after
 * `2.9.0`, one row per application, so no cut on releases can leave one without.
 */
export const withLatestReleases = (query: ComposerQuery): ComposerQuery =>
  query.pipe`WHERE ${mobileColumn('serviceVersion')} IS NOT NULL`.pipe`STATS ${resultColumn(
    'latestRelease'
  )} = MAX(TO_VERSION(${mobileColumn('serviceVersion')}))
      BY ${mobileColumn('serviceName')}`;

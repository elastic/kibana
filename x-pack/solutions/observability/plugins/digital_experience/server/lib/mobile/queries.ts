/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { mobileColumn } from '../../../common/mobile_panel';
import { MAX_ENVIRONMENTS } from '../constants';

/** The most used combinations of the environment fields to read; `toEnvironments` caps the names. */
const MAX_ENVIRONMENT_ROWS = MAX_ENVIRONMENTS * MAX_ENVIRONMENTS;

/** The documents counted per environment, by both environment fields. */
export const withEnvironmentCounts = (query: ComposerQuery): ComposerQuery =>
  query.pipe`STATS docs = COUNT(*) BY ${mobileColumn('environment')}, ${mobileColumn(
    'environmentName'
  )}`.pipe`SORT docs DESC`.pipe`LIMIT ${MAX_ENVIRONMENT_ROWS}`;

/** The sessions per release, most first (then the higher release), up to `limit`. */
export const withReleaseCounts = (query: ComposerQuery, limit: number): ComposerQuery =>
  query.pipe`WHERE ${mobileColumn('serviceVersion')} IS NOT NULL`
    .pipe`STATS sessions = COUNT_DISTINCT(${mobileColumn('sessionId')})
      BY release = ${mobileColumn('serviceVersion')}`.pipe`SORT sessions DESC, release DESC`
    .pipe`LIMIT ${limit}`;

/**
 * Each application's release with the most sessions, one row per application, so no cut on
 * releases can leave an application without one.
 */
export const withLatestReleases = (query: ComposerQuery): ComposerQuery =>
  query.pipe`WHERE ${mobileColumn('serviceVersion')} IS NOT NULL`
    .pipe`STATS sessions = COUNT_DISTINCT(${mobileColumn('sessionId')})
      BY ${mobileColumn('serviceName')}, release = ${mobileColumn('serviceVersion')}`
    .pipe`STATS latest_release = TOP(sessions, 1, "desc", release) BY ${mobileColumn(
    'serviceName'
  )}`;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { inValues, mobileColumn, mobileDocuments } from '../../../../common/mobile_panel';
import { withEnvironmentCounts, withLatestReleases } from '../../../lib/mobile/queries';
import { MAX_APPLICATIONS_PER_SOURCE } from '../constants';

/**
 * Sessions, users, exceptions and last seen per application and platform, most sessions first; a
 * metric whose field no index maps is 0.
 */
export const applicationsQuery = (): ComposerQuery =>
  mobileDocuments().pipe`STATS sessions = COUNT_DISTINCT(${mobileColumn('sessionId')}),
      users = COUNT_DISTINCT(${mobileColumn('installationId')}),
      exceptions = COUNT(${mobileColumn('exceptionType')}),
      last_seen = MAX(@timestamp)
    BY ${mobileColumn('serviceName')}, platform`.pipe`SORT sessions DESC, ${mobileColumn(
    'serviceName'
  )} ASC`.pipe`LIMIT ${MAX_APPLICATIONS_PER_SOURCE}`;

/**
 * The latest release, the one with the most sessions, of each of `serviceNames` on each platform
 * over the window the query is run with.
 */
export const latestReleasesQuery = (serviceNames: string[]): ComposerQuery =>
  withLatestReleases(mobileDocuments().pipe`WHERE ${inValues('serviceName', serviceNames)}`)
    .pipe`LIMIT ${MAX_APPLICATIONS_PER_SOURCE}`;

/** Every environment of the mobile applications, for the picker. */
export const environmentsQuery = (): ComposerQuery => withEnvironmentCounts(mobileDocuments());

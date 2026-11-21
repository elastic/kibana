/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { mobileDocuments } from '../../../../common/mobile/documents';
import { inValues, mobileColumn, resultColumn } from '../../../../common/mobile/fields';
import { kpiStats } from '../../../../common/mobile/kpis';
import { withEnvironmentCounts, withLatestReleases } from '../../../lib/mobile/queries';
import { MAX_APPLICATIONS_PER_SOURCE } from '../constants';

/**
 * Sessions, users, exceptions and last seen per application, with the platforms it reported on,
 * most sessions first; a metric whose field no index maps is 0. Documents without a service name
 * name no application, so they're left out.
 */
export const applicationsQuery = (): ComposerQuery =>
  mobileDocuments().pipe`WHERE ${mobileColumn('serviceName')} IS NOT NULL`.pipe`STATS ${[
    ...kpiStats(),
    esql.exp`${resultColumn('lastSeen')} = MAX(@timestamp)`,
    esql.exp`${resultColumn('platforms')} = VALUES(${resultColumn('platform')})`,
  ]} BY ${mobileColumn('serviceName')}`.pipe`SORT ${resultColumn('sessions')} DESC, ${mobileColumn(
    'serviceName'
  )} ASC`.pipe`LIMIT ${MAX_APPLICATIONS_PER_SOURCE}`;

/**
 * The newest release of each of `serviceNames` on any platform over the window the query is run
 * with.
 */
export const latestReleasesQuery = (serviceNames: string[]): ComposerQuery =>
  withLatestReleases(mobileDocuments().pipe`WHERE ${inValues('serviceName', serviceNames)}`)
    .pipe`LIMIT ${MAX_APPLICATIONS_PER_SOURCE}`;

/** Every environment of the mobile applications, for the picker. */
export const environmentsQuery = (): ComposerQuery => withEnvironmentCounts(mobileDocuments());

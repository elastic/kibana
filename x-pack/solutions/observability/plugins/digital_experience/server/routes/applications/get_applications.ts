/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, internal } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { APPLICATION_SOURCE } from '../../../common/application_source';
import type {
  ApplicationSource,
  ApplicationSummary,
  ApplicationsResponse,
  HistogramBuckets,
  PageLoadsOverTime,
  TimeSeriesPoint,
} from '../../../common/types/applications';
import { sortEnvironments } from '../../lib/helpers/environment';
import { describeError, isAccessDenied } from '../../lib/helpers/errors';
import type { SourceApplications } from './types';

type ApplicationsFetcher = () => Promise<SourceApplications>;
type AccessCheck = () => Promise<boolean>;

const NO_ACCESS_MESSAGE = i18n.translate('xpack.digitalExperience.applications.api.noAccess', {
  defaultMessage: "You don't have read access to the application data.",
});

const LOAD_FAILED_MESSAGE = i18n.translate('xpack.digitalExperience.applications.api.loadFailed', {
  defaultMessage: 'Could not load the applications. Check the Kibana server logs for details.',
});

interface SourceFailure {
  source: ApplicationSource;
  error: unknown;
}

const describeFailure = ({ source, error }: SourceFailure): string =>
  `Could not load the ${source} applications: ${describeError(error)}`;

/** The client error hides the Elasticsearch details, which name the user, roles and indices. */
const toClientError = (failures: SourceFailure[]) =>
  failures.every(({ error }) => isAccessDenied(error))
    ? forbidden(NO_ACCESS_MESSAGE)
    : internal(LOAD_FAILED_MESSAGE);

/** Web rows sort by page loads and mobile rows by sessions; web rows come first. */
const byActivityThenName = (a: ApplicationSummary, b: ApplicationSummary): number => {
  if (a.source === 'mobile' && b.source === 'mobile') {
    return b.sessions.count - a.sessions.count || a.serviceName.localeCompare(b.serviceName);
  }
  if (a.source === 'mobile' || b.source === 'mobile') {
    return a.source === 'mobile' ? 1 : -1;
  }
  return b.pageLoads.count - a.pageLoads.count || a.serviceName.localeCompare(b.serviceName);
};

/**
 * Merges the applications of each source; a source whose search fails is left out and listed in
 * `unavailableSources`, unless every source fails. Elasticsearch skips the indices of a wildcard
 * the user can't read instead of failing, so each source's access check, run alongside the
 * searches, lists the sources that loaded with only partial index access in
 * `partiallyAvailableSources`.
 */
export const getApplications = async ({
  histogram,
  getOtelApplications,
  getClassicApplications,
  getMobileApplications,
  hasPartialOtelAccess,
  hasPartialClassicAccess,
  hasPartialMobileAccess,
  logger,
}: {
  /** The page loads buckets every source was searched with. */
  histogram: HistogramBuckets;
  getOtelApplications: ApplicationsFetcher;
  /** Undefined when the Classic source is not available (serverless). */
  getClassicApplications?: ApplicationsFetcher;
  /** EDOT Android and iOS applications; left out by callers that don't list them. */
  getMobileApplications?: ApplicationsFetcher;
  /**
   * Resolves to `true` when the user can't read every index of the source; never rejects. Ignored
   * when the source read the sessions index.
   */
  hasPartialOtelAccess?: AccessCheck;
  hasPartialClassicAccess?: AccessCheck;
  hasPartialMobileAccess?: AccessCheck;
  logger: Logger;
}): Promise<ApplicationsResponse> => {
  const sources: Array<{
    source: ApplicationSource;
    fetch: ApplicationsFetcher;
    checkAccess?: AccessCheck;
  }> = [
    {
      source: APPLICATION_SOURCE.otel,
      fetch: getOtelApplications,
      checkAccess: hasPartialOtelAccess,
    },
  ];
  if (getClassicApplications) {
    sources.push({
      source: APPLICATION_SOURCE.classic,
      fetch: getClassicApplications,
      checkAccess: hasPartialClassicAccess,
    });
  }
  if (getMobileApplications) {
    sources.push({
      source: APPLICATION_SOURCE.mobile,
      fetch: getMobileApplications,
      checkAccess: hasPartialMobileAccess,
    });
  }

  const [results, partialAccess] = await Promise.all([
    Promise.allSettled(sources.map(({ fetch }) => fetch())),
    Promise.all(sources.map(async ({ checkAccess }) => (checkAccess ? checkAccess() : false))),
  ]);

  const loaded: SourceApplications[] = [];
  const failures: SourceFailure[] = [];
  const partiallyAvailableSources: ApplicationSource[] = [];
  const pageLoadsOverTime: PageLoadsOverTime = {
    otel: [],
    classic: [],
    histogram,
  };
  // Only EDOT Browser has sessions, and only when its source read them from the sessions index.
  let sessionsOverTime: TimeSeriesPoint[] | null = null;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { source } = sources[index];
      loaded.push(result.value);
      // Mobile applications have no page loads: the chart stays web-only.
      if (source !== APPLICATION_SOURCE.mobile) {
        pageLoadsOverTime[source] = result.value.pageLoadsOverTime;
      }
      if (source === APPLICATION_SOURCE.otel) {
        sessionsOverTime = result.value.sessionsOverTime;
      }
      // The sessions index is summarized with the access of the user who enabled sessions, so when
      // it answered (the only source with sessions), the user's raw indices hide no rows.
      if (partialAccess[index] && result.value.sessionsOverTime === null) {
        partiallyAvailableSources.push(source);
      }
    } else {
      failures.push({ source: sources[index].source, error: result.reason });
    }
  });

  if (loaded.length === 0) {
    failures.forEach((failure) => logger.error(describeFailure(failure)));
    throw toClientError(failures);
  }
  failures.forEach((failure) => logger.warn(describeFailure(failure)));

  return {
    applications: loaded.flatMap(({ applications }) => applications).sort(byActivityThenName),
    environments: sortEnvironments(loaded.flatMap(({ environments }) => environments)),
    pageLoadsOverTime,
    sessionsOverTime,
    unavailableSources: failures.map(({ source }) => source),
    partiallyAvailableSources,
  };
};

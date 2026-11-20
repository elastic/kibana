/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden, internal } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { APPLICATION_SOURCE, APPLICATION_TYPE } from '../../../common/application_source';
import type {
  ApplicationSource,
  ApplicationSummary,
  ApplicationsResponse,
  HistogramBuckets,
  PageLoadsOverTime,
  MobileAvailability,
  TimeSeriesPoint,
} from '../../../common/types/applications';
import { sortEnvironments } from '../../lib/helpers/environment';
import { describeError, isAccessDenied } from '../../lib/helpers/errors';
import type { SourceApplications, WebSourceApplications } from './types';

type ApplicationsFetcher = () => Promise<SourceApplications>;
type WebApplicationsFetcher = () => Promise<WebSourceApplications>;
type AccessCheck = () => Promise<boolean>;

/** A source's search, settled, and whether the user can read only part of its indices. */
const settle = async <TResult>(
  fetch: () => Promise<TResult>,
  checkAccess?: AccessCheck
): Promise<{ result: PromiseSettledResult<TResult>; isPartial: boolean }> => {
  const [[result], isPartial] = await Promise.all([
    Promise.allSettled([fetch()]),
    checkAccess ? checkAccess() : Promise.resolve(false),
  ]);
  return { result, isPartial };
};

const NO_ACCESS_MESSAGE = i18n.translate('xpack.digitalExperience.applications.api.noAccess', {
  defaultMessage: "You don't have read access to the application data.",
});

const LOAD_FAILED_MESSAGE = i18n.translate('xpack.digitalExperience.applications.api.loadFailed', {
  defaultMessage: 'Could not load the applications. Check the Kibana server logs for details.',
});

/** A failed search: of a source, or of the mobile applications. */
interface SourceFailure {
  /** The source, or `mobile` for the mobile applications, which are EDOT data. */
  name: string;
  source?: ApplicationSource;
  error: unknown;
}

const describeFailure = ({ name, error }: SourceFailure): string =>
  `Could not load the ${name} applications: ${describeError(error)}`;

/** The client error hides the Elasticsearch details, which name the user, roles and indices. */
const toClientError = (failures: SourceFailure[]) =>
  failures.every(({ error }) => isAccessDenied(error))
    ? forbidden(NO_ACCESS_MESSAGE)
    : internal(LOAD_FAILED_MESSAGE);

/** Web rows sort by page loads and mobile rows by sessions; web rows come first. */
const byActivityThenName = (a: ApplicationSummary, b: ApplicationSummary): number => {
  if (
    a.applicationType === APPLICATION_TYPE.mobile &&
    b.applicationType === APPLICATION_TYPE.mobile
  ) {
    return b.sessions.count - a.sessions.count || a.serviceName.localeCompare(b.serviceName);
  }
  if (a.applicationType === APPLICATION_TYPE.mobile) {
    return 1;
  }
  if (b.applicationType === APPLICATION_TYPE.mobile) {
    return -1;
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
  getOtelApplications: WebApplicationsFetcher;
  /** Undefined when the Classic source is not available (serverless). */
  getClassicApplications?: WebApplicationsFetcher;
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
  const webSources: Array<{
    source: ApplicationSource;
    fetch: WebApplicationsFetcher;
    checkAccess?: AccessCheck;
  }> = [
    {
      source: APPLICATION_SOURCE.otel,
      fetch: getOtelApplications,
      checkAccess: hasPartialOtelAccess,
    },
  ];
  if (getClassicApplications) {
    webSources.push({
      source: APPLICATION_SOURCE.classic,
      fetch: getClassicApplications,
      checkAccess: hasPartialClassicAccess,
    });
  }

  const [webSettled, mobileSettled] = await Promise.all([
    Promise.all(webSources.map(({ fetch, checkAccess }) => settle(fetch, checkAccess))),
    getMobileApplications ? settle(getMobileApplications, hasPartialMobileAccess) : undefined,
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
  webSettled.forEach(({ result, isPartial }, index) => {
    const { source } = webSources[index];
    if (result.status === 'rejected') {
      failures.push({ name: source, source, error: result.reason });
      return;
    }
    const { value } = result;
    loaded.push(value);
    pageLoadsOverTime[source] = value.pageLoadsOverTime;
    if (source === APPLICATION_SOURCE.otel) {
      sessionsOverTime = value.sessionsOverTime;
    }
    // The sessions index is summarized with the access of the user who enabled sessions, so when
    // it answered (the only source with sessions), the user's raw indices hide no rows.
    if (isPartial && value.sessionsOverTime === null) {
      partiallyAvailableSources.push(source);
    }
  });
  // Mobile has no page loads or sessions over time: the chart stays web-only.
  let mobileAvailability: MobileAvailability = 'complete';
  const mobileFailures: SourceFailure[] = [];
  if (mobileSettled?.result.status === 'fulfilled') {
    loaded.push(mobileSettled.result.value);
    mobileAvailability = mobileSettled.isPartial ? 'partial' : 'complete';
  } else if (mobileSettled) {
    mobileAvailability = 'unavailable';
    mobileFailures.push({ name: 'mobile', error: mobileSettled.result.reason });
  }

  const allFailures = [...failures, ...mobileFailures];
  if (loaded.length === 0) {
    allFailures.forEach((failure) => logger.error(describeFailure(failure)));
    throw toClientError(allFailures);
  }
  allFailures.forEach((failure) => logger.warn(describeFailure(failure)));

  return {
    applications: loaded.flatMap(({ applications }) => applications).sort(byActivityThenName),
    environments: sortEnvironments(loaded.flatMap(({ environments }) => environments)),
    pageLoadsOverTime,
    sessionsOverTime,
    unavailableSources: failures.flatMap(({ source }) => (source ? [source] : [])),
    partiallyAvailableSources,
    mobileAvailability,
  };
};

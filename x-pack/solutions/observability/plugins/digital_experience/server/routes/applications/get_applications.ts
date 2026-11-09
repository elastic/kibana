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
  PageLoadsOverTime,
} from '../../../common/types/applications';
import { sortEnvironments } from '../../lib/helpers/environment';
import { describeError, isAccessDenied } from '../../lib/helpers/errors';
import type { SourceApplications } from './types';

type ApplicationsFetcher = () => Promise<SourceApplications>;

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

const byPageLoadsThenName = (a: ApplicationSummary, b: ApplicationSummary): number =>
  b.pageLoads.count - a.pageLoads.count || a.serviceName.localeCompare(b.serviceName);

/**
 * Merges the applications of each source; a source whose search fails is left out and listed in
 * `unavailableSources`, unless every source fails. Elasticsearch skips the indices of a wildcard
 * the user can't read instead of failing, so partial index access returns fewer rows, unreported.
 */
export const getApplications = async ({
  getOtelApplications,
  getClassicApplications,
  logger,
}: {
  getOtelApplications: ApplicationsFetcher;
  /** Undefined when the Classic source is not available (serverless). */
  getClassicApplications?: ApplicationsFetcher;
  logger: Logger;
}): Promise<ApplicationsResponse> => {
  const sources: Array<{ source: ApplicationSource; fetch: ApplicationsFetcher }> = [
    { source: APPLICATION_SOURCE.otel, fetch: getOtelApplications },
  ];
  if (getClassicApplications) {
    sources.push({ source: APPLICATION_SOURCE.classic, fetch: getClassicApplications });
  }

  const results = await Promise.allSettled(sources.map(({ fetch }) => fetch()));

  const loaded: SourceApplications[] = [];
  const failures: SourceFailure[] = [];
  const pageLoadsOverTime: PageLoadsOverTime = { otel: [], classic: [] };
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      loaded.push(result.value);
      pageLoadsOverTime[sources[index].source] = result.value.pageLoadsOverTime;
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
    applications: loaded.flatMap(({ applications }) => applications).sort(byPageLoadsThenName),
    environments: sortEnvironments(loaded.flatMap(({ environments }) => environments)),
    pageLoadsOverTime,
    unavailableSources: failures.map(({ source }) => source),
  };
};

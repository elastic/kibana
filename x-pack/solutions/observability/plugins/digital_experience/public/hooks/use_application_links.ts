/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { pick } from 'lodash';
import qs from 'query-string';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import type { OverviewFilters } from '../../common/overview_filters';
import { encodeOverviewFilters } from '../../common/overview_filters_param';
import type { ApplicationSource } from '../../common/types/applications';
import { SHARED_FILTER_NAMES } from '../utils/overview_filters_query';
import type { SessionsListUrlQuery } from '../utils/sessions_list_query';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { SESSIONS_FILTER_RTS, useSharedFilters } from './use_shared_filters';
import { useDigitalExperienceRouter } from './use_digital_experience_router';
import { useKibanaServices } from './use_kibana_services';
import { useListQuery } from './use_list_query';

/** The Overview's own params in the URL besides its filters: the KQL query and percentile. */
const OVERVIEW_QUERY_KEYS = ['kuery', 'percentile'] as const;

/**
 * What the Sessions list selects of the filters it shares with the Overview (`browser`, `os` and
 * `country`, one value each), as the Overview's filters; none unless the URL is a Sessions one.
 */
const sessionsFiltersOf = (search: string): OverviewFilters => {
  const query = qs.parse(search);
  const filters: OverviewFilters = {};
  for (const name of SHARED_FILTER_NAMES) {
    const value = query[name];
    if (typeof value === 'string' && SESSIONS_FILTER_RTS[name].is(value)) {
      filters[name] = [{ value, exclude: false }];
    }
  }
  return filters;
};

export interface ApplicationLinks {
  overviewHref: string;
  /** The Overview's path in the app's router, for an in-app redirect. */
  overviewPath: string;
  errorsHref: string;
  networkHref: string;
  sessionsHref: (sessionsQuery?: SessionsListUrlQuery) => string;
  sessionHref: (sessionId: string, sessionsQuery?: SessionsListUrlQuery) => string;
}

/**
 * Links to an application's pages. They keep the applications list's query, so its breadcrumb
 * leads back to the same list, and the Overview's filters and KQL query, which the Sessions keep
 * only for the ones it has too (browser, OS and country, with one included value), and the
 * sessions list's state where given.
 */
export const useApplicationLinks = (
  serviceName: string,
  source: ApplicationSource
): ApplicationLinks => {
  const { application } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const listQuery = useListQuery();
  const sharedFilters = useSharedFilters();
  const { query: urlQuery } = useDigitalExperienceParams('/');
  const { search } = useLocation();

  return useMemo(() => {
    const toHref = (path: string) =>
      application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, { path });
    // The tabs of the Overview's family keep all of its filters and query, so they narrow the
    // errors, and they are still there on the way back.
    // On the Sessions tab there are no Overview filters, but the ones it shares carry back.
    const filters = urlQuery.filters ?? encodeOverviewFilters(sessionsFiltersOf(search));
    const tabQuery = {
      ...listQuery,
      ...pick(urlQuery, OVERVIEW_QUERY_KEYS),
      ...(filters ? { filters } : {}),
      source,
    };
    const query = { ...listQuery, ...sharedFilters, source };
    const overviewPath = router.link('/{serviceName}', {
      path: { serviceName },
      query: tabQuery,
    });
    return {
      overviewHref: toHref(overviewPath),
      overviewPath,
      errorsHref: toHref(
        router.link('/{serviceName}/errors', { path: { serviceName }, query: tabQuery })
      ),
      networkHref: toHref(
        router.link('/{serviceName}/network', { path: { serviceName }, query: tabQuery })
      ),
      sessionsHref: (sessionsQuery = {}) =>
        toHref(
          router.link('/{serviceName}/sessions', {
            path: { serviceName },
            query: { ...query, ...sessionsQuery },
          })
        ),
      sessionHref: (sessionId, sessionsQuery = {}) =>
        toHref(
          router.link('/{serviceName}/sessions/{sessionId}', {
            path: { serviceName, sessionId },
            query: { ...query, ...sessionsQuery },
          })
        ),
    };
  }, [application, router, listQuery, sharedFilters, urlQuery, search, serviceName, source]);
};

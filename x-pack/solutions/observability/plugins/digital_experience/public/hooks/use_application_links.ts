/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { pick } from 'lodash';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import type { ApplicationSource } from '../../common/types/applications';
import type { SessionsListUrlQuery } from '../utils/sessions_list_query';
import { useDigitalExperienceParams } from './use_digital_experience_params';
import { useSharedFilters } from './use_shared_filters';
import { useDigitalExperienceRouter } from './use_digital_experience_router';
import { useKibanaServices } from './use_kibana_services';
import { useListQuery } from './use_list_query';

/** The Overview's own params in the URL: its filters, KQL query and percentile. */
const OVERVIEW_QUERY_KEYS = [
  'browser',
  'os',
  'device',
  'country',
  'pageUrl',
  'kuery',
  'percentile',
] as const;

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

  return useMemo(() => {
    const toHref = (path: string) =>
      application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, { path });
    // The tabs of the Overview's family keep all of its filters and query, so they narrow the
    // errors, and they are still there on the way back.
    const tabQuery = { ...listQuery, ...pick(urlQuery, OVERVIEW_QUERY_KEYS), source };
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
  }, [application, router, listQuery, sharedFilters, urlQuery, serviceName, source]);
};

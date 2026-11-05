/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import type { ApplicationSource } from '../../common/types/applications';
import type { SessionsListUrlQuery } from '../utils/sessions_list_query';
import { useDigitalExperienceRouter } from './use_digital_experience_router';
import { useKibanaServices } from './use_kibana_services';
import { useListQuery } from './use_list_query';

export interface ApplicationLinks {
  overviewHref: string;
  sessionsHref: (sessionsQuery?: SessionsListUrlQuery) => string;
  sessionHref: (sessionId: string, sessionsQuery?: SessionsListUrlQuery) => string;
}

/**
 * Links to an application's pages. They keep the applications list's query, so its breadcrumb
 * leads back to the same list, and the sessions list's state where given.
 */
export const useApplicationLinks = (
  serviceName: string,
  source: ApplicationSource
): ApplicationLinks => {
  const { application } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  const listQuery = useListQuery();

  return useMemo(() => {
    const toHref = (path: string) =>
      application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, { path });
    const query = { ...listQuery, source };
    return {
      overviewHref: toHref(router.link('/{serviceName}', { path: { serviceName }, query })),
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
  }, [application, router, listQuery, serviceName, source]);
};

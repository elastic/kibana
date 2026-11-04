/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as t from 'io-ts';
import type { RouteMap } from '@kbn/typed-react-router-config';
import { createRouter, Outlet } from '@kbn/typed-react-router-config';
import { applicationSourceRt, DEFAULT_APPLICATION_SOURCE } from './utils/application_source';
import { DigitalExperienceLayout } from './application/digital_experience_layout';
import { useDigitalExperienceParams } from './hooks/use_digital_experience_params';
import type { ApplicationTabId } from './pages/application_details/application_page';
import { ApplicationPage } from './pages/application_details/application_page';
import { ApplicationsListPage } from './pages/applications_list/applications_list_page';
import { SessionDetailPage } from './pages/session_detail/session_detail_page';
import { sessionsListQueryRt } from './utils/sessions_list_query';

function ApplicationRoute({ tab }: { tab: ApplicationTabId }) {
  const {
    path: { serviceName },
    query: { source },
  } = useDigitalExperienceParams('/{serviceName}');
  return <ApplicationPage serviceName={serviceName} source={source} selectedTab={tab} />;
}

function SessionDetailRoute() {
  const {
    path: { serviceName, sessionId },
  } = useDigitalExperienceParams('/{serviceName}/sessions/{sessionId}');
  return <SessionDetailPage serviceName={serviceName} sessionId={sessionId} />;
}

// The router validates the query: an invalid value is replaced in the URL by the route's default,
// or removed when it has none (`RouteSelfHealErrorBoundary`, part of `RouterProvider`).
const digitalExperienceRoutes = {
  '/': {
    element: <DigitalExperienceLayout />,
    // Kept in the URL by `useSyncTimeRange`; the list's filters by `useQueryParam` (all when unset).
    params: t.type({
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
        environment: t.string,
        sourceFilter: applicationSourceRt,
      }),
    }),
    children: {
      '/{serviceName}': {
        element: <Outlet />,
        params: t.type({
          path: t.type({ serviceName: t.string }),
          query: t.type({ source: applicationSourceRt }),
        }),
        // Links without a source open the Classic Overview.
        defaults: { query: { source: DEFAULT_APPLICATION_SOURCE } },
        children: {
          '/{serviceName}/sessions/{sessionId}': {
            element: <SessionDetailRoute />,
            // The list's state too, so the Sessions breadcrumb leads back to the same list.
            params: t.type({ path: t.type({ sessionId: t.string }), query: sessionsListQueryRt }),
          },
          '/{serviceName}/sessions': {
            element: <ApplicationRoute tab="sessions" />,
            // Kept in the URL by `useSessionsListQuery`, so a link or reload shows the same list.
            params: t.type({ query: sessionsListQueryRt }),
          },
          '/{serviceName}': {
            element: <ApplicationRoute tab="overview" />,
          },
        },
      },
      '/': {
        element: <ApplicationsListPage />,
      },
    },
  },
} satisfies RouteMap;

export type DigitalExperienceRoutes = typeof digitalExperienceRoutes;

export const digitalExperienceRouter = createRouter(digitalExperienceRoutes);

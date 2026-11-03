/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as t from 'io-ts';
import type { RouteMap } from '@kbn/typed-react-router-config';
import { createRouter } from '@kbn/typed-react-router-config';
import { DigitalExperienceLayout } from './application/digital_experience_layout';
import { useDigitalExperienceParams } from './hooks/use_digital_experience_params';
import { ApplicationPage } from './pages/application_page';
import { ApplicationsListPage } from './pages/applications_list_page';

function ApplicationRoute() {
  const {
    path: { serviceName },
  } = useDigitalExperienceParams('/{serviceName}');
  return <ApplicationPage serviceName={serviceName} />;
}

export const digitalExperienceRoutes = {
  '/': {
    element: <DigitalExperienceLayout />,
    // Kept in the URL by `useSyncTimeRange`.
    params: t.partial({
      query: t.partial({
        rangeFrom: t.string,
        rangeTo: t.string,
      }),
    }),
    children: {
      '/{serviceName}': {
        element: <ApplicationRoute />,
        params: t.type({ path: t.type({ serviceName: t.string }) }),
      },
      '/': {
        element: <ApplicationsListPage />,
      },
    },
  },
} satisfies RouteMap;

export type DigitalExperienceRoutes = typeof digitalExperienceRoutes;

export const digitalExperienceRouter = createRouter(digitalExperienceRoutes);

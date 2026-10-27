/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Outlet } from '@kbn/typed-react-router-config';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from '../../common/feature';
import { useRouteBreadcrumb } from '../breadcrumbs/use_route_breadcrumb';
import { useKibanaServices } from '../hooks/use_kibana_services';
import { useDigitalExperienceRouter } from '../hooks/use_digital_experience_router';
import { useSyncTimeRange, useTimeRange } from '../hooks/use_time_range';
import { APPLICATIONS_LABEL, DIGITAL_EXPERIENCE_LABEL } from '../labels';

/** Root route: syncs the time range and registers the `Digital Experience › Applications` crumbs. */
export function DigitalExperienceLayout() {
  const { application } = useKibanaServices();
  const router = useDigitalExperienceRouter();
  useSyncTimeRange();
  const { timeRange } = useTimeRange();
  const applicationsHref = application.getUrlForApp(DIGITAL_EXPERIENCE_FEATURE_ID, {
    path: router.link('/', { query: timeRange }),
  });

  useRouteBreadcrumb([
    { text: DIGITAL_EXPERIENCE_LABEL, href: applicationsHref },
    { text: APPLICATIONS_LABEL, href: applicationsHref },
  ]);

  return <Outlet />;
}

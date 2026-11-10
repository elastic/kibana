/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Outlet } from '@kbn/typed-react-router-config';
import { useRouteBreadcrumb } from '../breadcrumbs/use_route_breadcrumb';
import { useApplicationsHref } from '../hooks/use_applications_href';
import { useSyncTimeRange } from '../hooks/use_time_range';
import { APPLICATIONS_LABEL, DIGITAL_EXPERIENCE_LABEL } from '../labels';

/** Root route: syncs the time range and registers the `Digital Experience › Applications` crumbs. */
export function DigitalExperienceLayout() {
  const hasValidTimeRange = useSyncTimeRange();
  const applicationsHref = useApplicationsHref();

  useRouteBreadcrumb([
    { text: DIGITAL_EXPERIENCE_LABEL, href: applicationsHref },
    { text: APPLICATIONS_LABEL, href: applicationsHref },
  ]);

  return hasValidTimeRange ? <Outlet /> : null;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RouteRenderer } from '@kbn/typed-react-router-config';
import type { DigitalExperienceStartDeps } from '../types';
import { useIsSideNavHidden } from './side_nav_context';

type ObservabilityPageTemplate =
  DigitalExperienceStartDeps['observabilityShared']['navigation']['PageTemplate'];

/** The Observability page template, without its navigation when a page asks for the width. */
export function AppPageTemplate({ PageTemplate }: { PageTemplate: ObservabilityPageTemplate }) {
  const isSideNavHidden = useIsSideNavHidden();
  return (
    // Unpadded, so each page's AppHeader spans the page; pages pad their own content.
    <PageTemplate
      pageSectionProps={{ paddingSize: 'none' }}
      // Only a page that hides the navigation decides; otherwise the sidebar setting does, which
      // is off where the layout has a navigation of its own, e.g. a serverless project.
      showSolutionNav={isSideNavHidden ? false : undefined}
    >
      <RouteRenderer />
    </PageTemplate>
  );
}

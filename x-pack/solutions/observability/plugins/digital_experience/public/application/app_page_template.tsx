/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RouteRenderer } from '@kbn/typed-react-router-config';
import type { DigitalExperienceStartDeps } from '../types';
import { useMovableContent } from '../hooks/use_movable_content';
import { useIsSideNavHidden } from './side_nav_context';

type ObservabilityPageTemplate =
  DigitalExperienceStartDeps['observabilityShared']['navigation']['PageTemplate'];

/** The Observability page template, without its navigation when a page asks for the width. */
export function AppPageTemplate({ PageTemplate }: { PageTemplate: ObservabilityPageTemplate }) {
  const isSideNavHidden = useIsSideNavHidden();
  // The template swaps its root component with the navigation, which would remount the page and
  // load it again; the page is mounted once and moves into whichever template shows.
  const page = useMovableContent(<RouteRenderer />);
  return (
    <>
      {page.portal}
      {/* Unpadded, so each page's AppHeader spans the page; pages pad their own content. */}
      <PageTemplate pageSectionProps={{ paddingSize: 'none' }} hideSolutionNav={isSideNavHidden}>
        {page.slot}
      </PageTemplate>
    </>
  );
}

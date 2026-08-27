/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';

import type { ExperimentalFeatures } from '../../common';
import { DETONATE_DETAIL_PATH, DETONATE_PATH, SecurityPageName } from '../../common/constants';
import type { SecuritySubPluginRoutes } from '../app/types';
// PluginTemplateWrapper mounts the expandable flyout provider, without which the detail page
// cannot open the process analyzer.
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';
import { DetonationDetailPage } from './pages/detail';
import { DetonateLandingPage } from './pages/landing';

const DetonateRoutes = () => (
  <PluginTemplateWrapper>
    <SecurityRoutePageWrapper pageName={SecurityPageName.detonate}>
      <Routes>
        <Route path={DETONATE_DETAIL_PATH} component={DetonationDetailPage} />
        <Route path={DETONATE_PATH} exact component={DetonateLandingPage} />
      </Routes>
    </SecurityRoutePageWrapper>
  </PluginTemplateWrapper>
);

/**
 * Detonate ships dark. Returning no routes when the flag is off leaves `/detonate` to fall through
 * to the application's not-found page.
 */
export const getDetonateRoutes = (
  experimentalFeatures: ExperimentalFeatures
): SecuritySubPluginRoutes =>
  experimentalFeatures.detonateEnabled ? [{ path: DETONATE_PATH, component: DetonateRoutes }] : [];

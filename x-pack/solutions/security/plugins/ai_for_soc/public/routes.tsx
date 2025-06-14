/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityPageNameAiSoc } from '@kbn/deeplinks-security';
import { EuiLoadingSpinner } from '@elastic/eui';

import { APP_PATH } from '../common/constants';
import { AiForSocLandingPage } from './pages/landing';
import { withAiRoutePageWrapper } from './navigation/ai_navigation/ai_route_page_wrapper';

// Define additional paths for different features
export const ALERT_ANALYSIS_PATH = `${APP_PATH}/alert-analysis`;
export const THREAT_DETECTION_PATH = `${APP_PATH}/threat-detection`;
export const INCIDENT_RESPONSE_PATH = `${APP_PATH}/incident-response`;

export const routes = [
  {
    path: `${APP_PATH}/get_started`,
    component: EuiLoadingSpinner,
  },
  // Catch-all route that redirects to landing page
  {
    path: `${APP_PATH}/*`,
    component: withAiRoutePageWrapper(AiForSocLandingPage, SecurityPageNameAiSoc.landing),
  },
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RouteComponentProps, RouteProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { AlertSummaryContainer } from './pages/alert_summary';
import {
  ALERT_SUMMARY_PATH,
  ALERTS_PATH,
  DETECTIONS_PATH,
  SecurityPageName,
} from '../../common/constants';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { Alerts } from './pages/alerts';
import { withSecurityRoutePageWrapper } from '../common/components/security_route_page_wrapper';

const AlertsRoutes = () => (
  <PluginTemplateWrapper>
    <Alerts />
  </PluginTemplateWrapper>
);

const DetectionsRedirects = ({ location }: RouteComponentProps) =>
  location.pathname === DETECTIONS_PATH ? (
    <Redirect to={{ ...location, pathname: ALERTS_PATH }} />
  ) : (
    <Redirect to={{ ...location, pathname: location.pathname.replace(DETECTIONS_PATH, '') }} />
  );

export const routes: RouteProps[] = [
  {
    path: DETECTIONS_PATH,
    component: withSecurityRoutePageWrapper(DetectionsRedirects, SecurityPageName.detections),
  },
  {
    path: ALERTS_PATH,
    component: withSecurityRoutePageWrapper(AlertsRoutes, SecurityPageName.alerts),
  },
  {
    path: ALERT_SUMMARY_PATH,
    component: withSecurityRoutePageWrapper(AlertSummaryContainer, SecurityPageName.alertSummary),
  },
];

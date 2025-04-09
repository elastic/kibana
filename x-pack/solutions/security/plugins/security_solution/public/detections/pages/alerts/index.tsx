/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import {
  ALERT_DETAILS_REDIRECT_PATH,
  ALERTS_PATH,
  ALERT_SUMMARY_PATH,
  SecurityPageName,
} from '../../../../common/constants';
import { DetectionEnginePage } from './detection_engine';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { AlertDetailsRedirect } from './alert_details_redirect';
import { AlertSummaryContainer } from '../alert_summary';

const AlertsRoute = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <DetectionEnginePage />
    <SpyRoute pageName={SecurityPageName.alerts} />
  </TrackApplicationView>
);

export const routes = [
  {
    path: ALERTS_PATH,
    component: AlertsRoute,
  },
  {
    path: `${ALERT_DETAILS_REDIRECT_PATH}/:alertId`,
    component: AlertDetailsRedirect,
  },
  {
    path: ALERT_SUMMARY_PATH,
    component: AlertSummaryContainer,
  },
];

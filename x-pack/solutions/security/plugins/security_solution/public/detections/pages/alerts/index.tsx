/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { i18n } from '@kbn/i18n';
import { AlertsPage } from './alerts';
import { ALERTS_PATH, SecurityPageName } from '../../../../common/constants';
import { NotFoundPage } from '../../../app/404';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { useReadonlyHeader } from '../../../use_readonly_header';

const READ_ONLY_BADGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertsPage.badge.readOnly.tooltip',
  {
    defaultMessage: 'Unable to update alerts',
  }
);

const AlertsRoute = () => (
  <TrackApplicationView viewId={SecurityPageName.alerts}>
    <AlertsPage />
    <SpyRoute pageName={SecurityPageName.alerts} />
  </TrackApplicationView>
);

export const AlertsContainerComponent: React.FC = () => {
  useReadonlyHeader(READ_ONLY_BADGE_TOOLTIP);
  return (
    <Routes>
      <Route path={ALERTS_PATH} exact component={AlertsRoute} />
      {/* Redirect to the alerts page filtered for the given alert id */}
      <Route component={NotFoundPage} />
    </Routes>
  );
};

export const Alerts = React.memo(AlertsContainerComponent);

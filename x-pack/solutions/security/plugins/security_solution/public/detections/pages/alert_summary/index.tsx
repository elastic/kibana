/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { AlertSummaryPage } from './alert_summary_page';
import { SpyRoute } from '../../../common/utils/route/spy_routes';
import { NotFoundPage } from '../../../app/404';
import { ALERT_SUMMARY_PATH, SecurityPageName } from '../../../../common/constants';
import { PluginTemplateWrapper } from '../../../common/components/plugin_template_wrapper';

const AlertSummaryTelemetry = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.alertSummary}>
      <AlertSummaryPage />
      <SpyRoute pageName={SecurityPageName.alertSummary} />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const AlertSummaryContainer: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route path={ALERT_SUMMARY_PATH} exact component={AlertSummaryTelemetry} />
      <Route component={NotFoundPage} />
    </Routes>
  );
});
AlertSummaryContainer.displayName = 'AlertSummaryContainer';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointOf, ServerRouteRepository } from '@kbn/server-route-repository';
import { listSessionReplaySessionsRoute } from './session_replay/list_sessions';
import { getSessionRoute } from './session_replay/get_session';
import { getSessionReplayEventsRoute } from './session_replay/get_events';
import { listLiveReplaySessionsRoute } from './session_replay/live';
import { getSessionFunnelRoute } from './session_replay/funnel';
import {
  createConversionGoalRoute,
  deleteConversionGoalRoute,
  listConversionGoalsRoute,
  updateConversionGoalRoute,
} from './session_replay/goals';
import { getSessionPatternsRoute } from './session_replay/patterns';
import {
  getSessionReplaySettingsRoute,
  updateSessionReplaySettingsRoute,
} from './session_replay/settings';
import { getRumFiltersRoute } from './rum/filters';
import { listRumRemoteClustersRoute } from './rum/remote_clusters';
import { getRumAppsRoute, getRumAppsSpanRoute } from './rum/apps';
import { getRumAppSettingsRoute, putRumAppSettingsRoute } from './rum/app_settings';
import { getRumOverviewRoute } from './rum/overview';
import { getRumTrendsRoute } from './rum/trends';
import { getRumClickMapRoute } from './rum/click_map';
import { getRumPageDetailRoute, getRumPagesRoute } from './rum/pages';
import { getRumErrorsRoute } from './rum/errors';
import { getRumReportRoute } from './rum/reports';
import {
  createRumReportScheduleRoute,
  deleteRumReportScheduleRoute,
  listRumReportEmailConnectorsRoute,
  listRumReportSchedulesRoute,
  sendRumReportNowRoute,
  sendRumReportScheduleNowRoute,
  testRumReportEmailConnectorRoute,
  updateRumReportScheduleRoute,
} from './rum/schedules';
import {
  createRumAlertRoute,
  deleteRumAlertRoute,
  disableRumAlertRoute,
  enableRumAlertRoute,
  generateRumAlertEsqlRoute,
  getRumAlertStatusRoute,
  listRumAlertsRoute,
  previewRumAlertEsqlRoute,
  upsertRumAlertNotificationsRoute,
} from './rum/alerts';
import { generateRumBudgetKqlRoute, listRumBudgetsRoute } from './rum/budgets';
import { getRumAnalyticsStatusRoute, installRumSessionsTransformRoute } from './rum/analytics';

function getTypedUxServerRouteRepository() {
  return {
    ...listSessionReplaySessionsRoute,
    ...getSessionRoute,
    ...getSessionReplayEventsRoute,
    ...listLiveReplaySessionsRoute,
    ...getSessionFunnelRoute,
    ...listConversionGoalsRoute,
    ...createConversionGoalRoute,
    ...updateConversionGoalRoute,
    ...deleteConversionGoalRoute,
    ...getSessionPatternsRoute,
    ...getSessionReplaySettingsRoute,
    ...updateSessionReplaySettingsRoute,
    ...getRumFiltersRoute,
    ...listRumRemoteClustersRoute,
    ...getRumAppsRoute,
    ...getRumAppsSpanRoute,
    ...getRumAppSettingsRoute,
    ...putRumAppSettingsRoute,
    ...getRumOverviewRoute,
    ...getRumTrendsRoute,
    ...getRumClickMapRoute,
    ...getRumPageDetailRoute,
    ...getRumPagesRoute,
    ...getRumErrorsRoute,
    ...getRumReportRoute,
    ...listRumReportEmailConnectorsRoute,
    ...listRumReportSchedulesRoute,
    ...createRumReportScheduleRoute,
    ...updateRumReportScheduleRoute,
    ...deleteRumReportScheduleRoute,
    ...sendRumReportNowRoute,
    ...sendRumReportScheduleNowRoute,
    ...testRumReportEmailConnectorRoute,
    ...getRumAlertStatusRoute,
    ...listRumAlertsRoute,
    ...createRumAlertRoute,
    ...deleteRumAlertRoute,
    ...enableRumAlertRoute,
    ...disableRumAlertRoute,
    ...generateRumAlertEsqlRoute,
    ...previewRumAlertEsqlRoute,
    ...upsertRumAlertNotificationsRoute,
    ...listRumBudgetsRoute,
    ...generateRumBudgetKqlRoute,
    ...getRumAnalyticsStatusRoute,
    ...installRumSessionsTransformRoute,
  };
}

export const getUxServerRouteRepository = (): ServerRouteRepository => {
  return getTypedUxServerRouteRepository();
};

export type UxServerRouteRepository = ReturnType<typeof getTypedUxServerRouteRepository>;
export type UxAPIEndpoint = EndpointOf<UxServerRouteRepository>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateSLOParams } from '@kbn/slo-schema';
import type { DashboardState } from '@kbn/dashboard-plugin/server/content_management/latest';
import { transformDashboardIn } from '@kbn/dashboard-plugin/server/content_management/latest';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '@kbn/deeplinks-analytics/constants';
import { generateTransformHealthPanel } from './rollup_events_panel';
import { generateSummaryUpdatePanel } from './summary_update_panel';
import { generateSourceDataPanel } from './good_vs_bad_events_panel';

export const getHealthDashboard = async ({
  sloId,
  sloParams,
  soClient,
  logger,
}: {
  sloId: string;
  sloParams: CreateSLOParams;
  soClient: SavedObjectsClientContract;
  logger: Logger;
}) => {
  const transformHealthPanel = generateTransformHealthPanel(sloId);
  const summaryUpdatePanel = generateSummaryUpdatePanel(sloId);
  const sourceDataPanel = generateSourceDataPanel(sloParams);
  const panels = [transformHealthPanel, summaryUpdatePanel];
  if (sourceDataPanel) {
    panels.push(sourceDataPanel);
  }

  const dashboardState: DashboardState = {
    title: `${sloParams.name}`,
    panels,
    tags: sloParams.tags || [],
  };

  // Transform dashboard state to saved object format
  const {
    attributes,
    references,
    error: transformError,
  } = transformDashboardIn({
    dashboardState,
    incomingReferences: [],
  });

  if (transformError) {
    throw new Error(`Failed to transform dashboard: ${transformError.message}`);
  }

  // Create the dashboard using the saved objects client
  const dashboard = await soClient.create(DASHBOARD_SAVED_OBJECT_TYPE, attributes, {
    references,
  });

  logger.info(`Created dashboard ${dashboard.id} for SLO ${sloId}`);

  return dashboard;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-browser/src';
import { CoreStart } from '@kbn/core/public';
import { ClientPluginsStart } from '../../../plugin';
import {
  ADD_SYNTHETICS_MONITORS_OVERVIEW_ACTION_ID,
  ADD_SYNTHETICS_OVERVIEW_ACTION_ID,
} from './constants';

export const registerSyntheticsUiActions = async (
  coreStart: CoreStart,
  pluginsStart: ClientPluginsStart
) => {
  const { uiActions, cloud, serverless } = pluginsStart;

  // Assign triggers
  // Only register these actions in stateful kibana, and the serverless observability project
  if (Boolean((serverless && cloud?.serverless.projectType === 'observability') || !serverless)) {
    uiActions.addTriggerActionAsync(
      ADD_PANEL_TRIGGER,
      ADD_SYNTHETICS_OVERVIEW_ACTION_ID,
      async () => {
        const { createStatusOverviewPanelAction } = await import('./add_panel_actions_module');
        return createStatusOverviewPanelAction(coreStart, pluginsStart);
      }
    );
    uiActions.addTriggerActionAsync(
      ADD_PANEL_TRIGGER,
      ADD_SYNTHETICS_MONITORS_OVERVIEW_ACTION_ID,
      async () => {
        const { createMonitorsOverviewPanelAction } = await import('./add_panel_actions_module');
        return createMonitorsOverviewPanelAction(coreStart, pluginsStart);
      }
    );
  }
};

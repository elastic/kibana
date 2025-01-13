/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicSetup } from '@kbn/ui-actions-plugin/public/plugin';
import { SLOPublicPluginsStart } from '..';
import { SLORepositoryClient } from '../types';
import { createAddAlertsPanelAction } from './create_alerts_panel_action';
import { createBurnRatePanelAction } from './create_burn_rate_panel_action';
import { createAddErrorBudgetPanelAction } from './create_error_budget_action';
import { createOverviewPanelAction } from './create_overview_panel_action';

export function registerSloUiActions(
  uiActions: UiActionsPublicSetup,
  coreStart: CoreStart,
  pluginsStart: SLOPublicPluginsStart,
  sloClient: SLORepositoryClient
) {
  const { serverless, cloud } = pluginsStart;

  // Initialize actions
  const addOverviewPanelAction = createOverviewPanelAction(coreStart, pluginsStart, sloClient);
  const addErrorBudgetPanelAction = createAddErrorBudgetPanelAction(
    coreStart,
    pluginsStart,
    sloClient
  );
  const addAlertsPanelAction = createAddAlertsPanelAction(coreStart, pluginsStart, sloClient);
  const addBurnRatePanelAction = createBurnRatePanelAction(coreStart, pluginsStart, sloClient);

  // Assign triggers
  // Only register these actions in stateful kibana, and the serverless observability project
  if (Boolean((serverless && cloud?.serverless.projectType === 'observability') || !serverless)) {
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addOverviewPanelAction);
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addErrorBudgetPanelAction);
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addAlertsPanelAction);
    uiActions.addTriggerAction(ADD_PANEL_TRIGGER, addBurnRatePanelAction);
  }
}

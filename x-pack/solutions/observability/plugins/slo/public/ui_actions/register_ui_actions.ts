/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UiActionsPublicSetup } from '@kbn/ui-actions-plugin/public/plugin';
import { ADD_SLO_ALERTS_ACTION_ID } from '../../common/embeddables/alerts/constants';
import type { SLOPublicPluginsStart } from '..';
import type { SLORepositoryClient } from '../types';
import { ADD_SLO_ERROR_BUDGET_ACTION_ID } from '../embeddable/slo/error_budget/constants';
import { ADD_SLO_OVERVIEW_ACTION_ID } from '../embeddable/slo/overview/constants';
import { ADD_BURN_RATE_ACTION_ID } from '../embeddable/slo/burn_rate/constants';

export function registerSloUiActions(
  uiActions: UiActionsPublicSetup,
  core: CoreSetup<SLOPublicPluginsStart>,
  sloClient: SLORepositoryClient
) {
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_SLO_OVERVIEW_ACTION_ID, async () => {
    const [{ createOverviewPanelAction }, [coreStart, pluginsStart]] = await Promise.all([
      import('./add_panel_actions_module'),
      core.getStartServices(),
    ]);
    return createOverviewPanelAction(coreStart, pluginsStart, sloClient);
  });
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_SLO_ERROR_BUDGET_ACTION_ID, async () => {
    const [{ createAddErrorBudgetPanelAction }, [coreStart, pluginsStart]] = await Promise.all([
      import('./add_panel_actions_module'),
      core.getStartServices(),
    ]);
    return createAddErrorBudgetPanelAction(coreStart, pluginsStart, sloClient);
  });
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_SLO_ALERTS_ACTION_ID, async () => {
    const [{ createAddAlertsPanelAction }, [coreStart, pluginsStart]] = await Promise.all([
      import('./add_panel_actions_module'),
      core.getStartServices(),
    ]);
    return createAddAlertsPanelAction(coreStart, pluginsStart, sloClient);
  });
  uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_BURN_RATE_ACTION_ID, async () => {
    const [{ createBurnRatePanelAction }, [coreStart, pluginsStart]] = await Promise.all([
      import('./add_panel_actions_module'),
      core.getStartServices(),
    ]);
    return createBurnRatePanelAction(coreStart, pluginsStart, sloClient);
  });
}

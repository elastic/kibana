/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { CoreSetup } from '@kbn/core/public';
import {
  CELL_VALUE_TRIGGER,
  SECURITY_CELL_ACTIONS_ALERTS_COUNT,
  SECURITY_CELL_ACTIONS_CASE_EVENTS,
  SECURITY_CELL_ACTIONS_DEFAULT,
  SECURITY_CELL_ACTIONS_DETAILS_FLYOUT,
  SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import {
  createFilterInCellActionFactory,
  createFilterInDiscoverCellActionFactory,
  createFilterOutCellActionFactory,
  createFilterOutDiscoverCellActionFactory,
} from './filter';
import {
  createAddToTimelineLensAction,
  createAddToTimelineCellActionFactory,
  createInvestigateInNewTimelineCellActionFactory,
  createAddToTimelineDiscoverCellActionFactory,
} from './add_to_timeline';
import { createShowTopNCellActionFactory } from './show_top_n';
import {
  createCopyToClipboardLensAction,
  createCopyToClipboardCellActionFactory,
  createCopyToClipboardDiscoverCellActionFactory,
} from './copy_to_clipboard';
import { createToggleColumnCellActionFactory } from './toggle_column';
import { createToggleUserAssetFieldCellActionFactory } from './toggle_asset_column';
import type {
  DiscoverCellActionName,
  DiscoverCellActions,
  SecurityCellActionName,
  SecurityCellActions,
} from './types';
import { enhanceActionWithTelemetry } from './telemetry';
import { registerDiscoverHistogramActions } from './register_discover_histogram_actions';
import { createFilterInLensAction } from './filter/lens/filter_in';
import { createFilterOutLensAction } from './filter/lens/filter_out';

export const registerUIActions = async (
  store: SecurityAppStore,
  history: History,
  coreSetup: CoreSetup,
  services: StartServices
) => {
  registerLensEmbeddableActions(store, services);
  registerDiscoverCellActions(store, services);
  registerCellActions(store, history, services);
  // TODO: Remove discover histogram actions when timeline esql tab is extracted from discover
  await registerDiscoverHistogramActions(store, history, coreSetup, services);
};

const registerLensEmbeddableActions = (store: SecurityAppStore, services: StartServices) => {
  const { uiActions } = services;

  const filterInLegendActions = createFilterInLensAction({ store, order: 2, services });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, filterInLegendActions);

  const filterOutLegendActions = createFilterOutLensAction({ store, order: 3, services });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, filterOutLegendActions);

  const addToTimelineAction = createAddToTimelineLensAction({ store, order: 4 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, addToTimelineAction);

  const copyToClipboardAction = createCopyToClipboardLensAction({ order: 5 });
  uiActions.addTriggerAction(CELL_VALUE_TRIGGER, copyToClipboardAction);
};

const registerDiscoverCellActions = (store: SecurityAppStore, services: StartServices) => {
  const { uiActions } = services;

  const DiscoverCellActionsFactories: DiscoverCellActions = {
    filterIn: createFilterInDiscoverCellActionFactory({ store, services }),
    filterOut: createFilterOutDiscoverCellActionFactory({ store, services }),
    addToTimeline: createAddToTimelineDiscoverCellActionFactory({ store, services }),
    copyToClipboard: createCopyToClipboardDiscoverCellActionFactory({ services }),
  };

  const addDiscoverEmbeddableCellActions = (
    triggerId: string,
    actionsOrder: DiscoverCellActionName[]
  ) => {
    actionsOrder.forEach((actionName, order) => {
      const actionFactory = DiscoverCellActionsFactories[actionName];
      if (actionFactory) {
        const action = actionFactory({ id: `${triggerId}-${actionName}`, order });
        const actionWithTelemetry = enhanceActionWithTelemetry(action, services);
        uiActions.addTriggerAction(triggerId, actionWithTelemetry);
      }
    });
  };

  // this trigger is already registered by discover search embeddable
  addDiscoverEmbeddableCellActions(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'copyToClipboard',
  ]);
};

const registerCellActions = (
  store: SecurityAppStore,
  _history: History,
  services: StartServices
) => {
  const { uiActions } = services;

  const cellActionsFactories: SecurityCellActions = {
    filterIn: createFilterInCellActionFactory({ store, services }),
    filterOut: createFilterOutCellActionFactory({ store, services }),
    addToTimeline: createAddToTimelineCellActionFactory({ store, services }),
    investigateInNewTimeline: createInvestigateInNewTimelineCellActionFactory({ store, services }),
    showTopN: createShowTopNCellActionFactory({ services }),
    copyToClipboard: createCopyToClipboardCellActionFactory({ services }),
    toggleColumn: createToggleColumnCellActionFactory({ store, services }),
    toggleUserAssetField: createToggleUserAssetFieldCellActionFactory({ store }),
  };

  const registerCellActionsTrigger = (
    triggerId: string,
    actionsOrder: SecurityCellActionName[]
  ) => {
    actionsOrder.forEach((actionName, order) => {
      const actionFactory = cellActionsFactories[actionName];
      if (actionFactory) {
        const action = actionFactory({ id: `${triggerId}-${actionName}`, order });
        const actionWithTelemetry = enhanceActionWithTelemetry(action, services);
        uiActions.addTriggerAction(triggerId, actionWithTelemetry);
      }
    });
  };

  registerCellActionsTrigger(SECURITY_CELL_ACTIONS_DEFAULT, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'showTopN',
    'copyToClipboard',
  ]);

  registerCellActionsTrigger(SECURITY_CELL_ACTIONS_DETAILS_FLYOUT, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'toggleColumn',
    'toggleUserAssetField',
    'showTopN',
    'copyToClipboard',
  ]);

  registerCellActionsTrigger(SECURITY_CELL_ACTIONS_ALERTS_COUNT, ['investigateInNewTimeline']);

  registerCellActionsTrigger(SECURITY_CELL_ACTIONS_CASE_EVENTS, [
    'addToTimeline',
    'copyToClipboard',
  ]);
};

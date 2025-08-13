/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CELL_VALUE_TRIGGER } from '@kbn/embeddable-plugin/public';
import type { History } from 'history';
import { SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID } from '@kbn/discover-plugin/public';
import type { CoreSetup } from '@kbn/core/public';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import {
  createFilterInCellActionFactory,
  createFilterInDiscoverCellActionFactory,
  createFilterOutCellActionFactory,
  createFilterOutDiscoverCellActionFactory,
} from './filter';
import {
  createAddToTimelineCellActionFactory,
  createInvestigateInNewTimelineCellActionFactory,
  createAddToTimelineDiscoverCellActionFactory,
} from './add_to_timeline';
import { createShowTopNCellActionFactory } from './show_top_n';
import {
  createCopyToClipboardCellActionFactory,
  createCopyToClipboardDiscoverCellActionFactory,
} from './copy_to_clipboard';
import { createToggleColumnCellActionFactory } from './toggle_column';
import { createToggleUserAssetFieldCellActionFactory } from './toggle_asset_column';
import { SecurityCellActionsTrigger } from './constants';
import type {
  DiscoverCellActionName,
  DiscoverCellActions,
  SecurityCellActionName,
  SecurityCellActions,
} from './types';
import { registerDiscoverHistogramActions } from './register_discover_histogram_actions';

export const CELL_VALUE_LENS_LEGEND_FILTER_IN_ACTION = 'CELL_VALUE_LENS_LEGEND_FILTER_IN_ACTION';
export const CELL_VALUE_LENS_LEGEND_FILTER_OUT_ACTION = 'CELL_VALUE_LENS_LEGEND_FILTER_OUT_ACTION';
export const CELL_VALUE_LENS_LEGEND_ADD_TO_TIMELINE_ACTION =
  'CELL_VALUE_LENS_LEGEND_ADD_TO_TIMELINE_ACTION';
export const CELL_VALUE_LENS_LEGEND_COPY_TO_CLIPBOARD_ACTION =
  'CELL_VALUE_LENS_LEGEND_COPY_TO_CLIPBOARD_ACTION';

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

  uiActions.addTriggerActionAsync(
    CELL_VALUE_TRIGGER,
    CELL_VALUE_LENS_LEGEND_FILTER_IN_ACTION,
    async () => {
      const { createFilterInLensAction } = await import('./filter/lens/filter_in');
      return createFilterInLensAction({ store, order: 2, services });
    }
  );
  uiActions.addTriggerActionAsync(
    CELL_VALUE_TRIGGER,
    CELL_VALUE_LENS_LEGEND_FILTER_OUT_ACTION,
    async () => {
      const { createFilterOutLensAction } = await import('./filter/lens/filter_out');
      return createFilterOutLensAction({ store, order: 3, services });
    }
  );

  uiActions.addTriggerActionAsync(
    CELL_VALUE_TRIGGER,
    CELL_VALUE_LENS_LEGEND_ADD_TO_TIMELINE_ACTION,
    async () => {
      const { createAddToTimelineLensAction } = await import('./add_to_timeline');
      return createAddToTimelineLensAction({ store, order: 4 });
    }
  );

  uiActions.addTriggerActionAsync(
    CELL_VALUE_TRIGGER,
    CELL_VALUE_LENS_LEGEND_COPY_TO_CLIPBOARD_ACTION,
    async () => {
      const { createCopyToClipboardLensAction } = await import('./copy_to_clipboard');
      return createCopyToClipboardLensAction({ order: 5 });
    }
  );
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

        uiActions.addTriggerActionAsync(triggerId, `${triggerId}-${actionName}`, async () => {
          const { enhanceActionWithTelemetry } = await import('./telemetry');
          return enhanceActionWithTelemetry(action, services);
        });
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
    triggerId: SecurityCellActionsTrigger,
    actionsOrder: SecurityCellActionName[]
  ) => {
    uiActions.registerTrigger({ id: triggerId });
    actionsOrder.forEach((actionName, order) => {
      const actionFactory = cellActionsFactories[actionName];
      if (actionFactory) {
        uiActions.addTriggerActionAsync(triggerId, `${triggerId}-${actionName}`, async () => {
          const action = actionFactory({ id: `${triggerId}-${actionName}`, order });
          const { enhanceActionWithTelemetry } = await import('./telemetry');
          return enhanceActionWithTelemetry(action, services);
        });
      }
    });
  };

  registerCellActionsTrigger(SecurityCellActionsTrigger.DEFAULT, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'showTopN',
    'copyToClipboard',
  ]);

  registerCellActionsTrigger(SecurityCellActionsTrigger.DETAILS_FLYOUT, [
    'filterIn',
    'filterOut',
    'addToTimeline',
    'toggleColumn',
    'toggleUserAssetField',
    'showTopN',
    'copyToClipboard',
  ]);

  registerCellActionsTrigger(SecurityCellActionsTrigger.ALERTS_COUNT, ['investigateInNewTimeline']);
};

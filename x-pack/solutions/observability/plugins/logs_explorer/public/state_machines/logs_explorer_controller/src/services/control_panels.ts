/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import deepEqual from 'fast-deep-equal';
import { mapValues, pick } from 'lodash';
import { InvokeCreator } from 'xstate';
import {
  availableControlPanelFields,
  controlPanelConfigs,
  ControlPanelRT,
  ControlPanels,
} from '../../../../../common';
import { LogsExplorerControllerContext, LogsExplorerControllerEvent } from '../types';

export const initializeControlPanels =
  (): InvokeCreator<LogsExplorerControllerContext, LogsExplorerControllerEvent> =>
  async (context) => {
    if (!('discoverStateContainer' in context)) return;
    return context.controlPanels
      ? constructControlPanelsWithDataViewId(context.discoverStateContainer, context.controlPanels)
      : undefined;
  };

export const subscribeControlGroup =
  (): InvokeCreator<LogsExplorerControllerContext, LogsExplorerControllerEvent> =>
  (context) =>
  (send) => {
    if (!('controlGroupAPI' in context)) return;
    if (!('discoverStateContainer' in context)) return;
    const { discoverStateContainer } = context;

    const filtersSubscription = context.controlGroupAPI.filters$.subscribe((newFilters = []) => {
      discoverStateContainer.internalState.transitions.setCustomFilters(newFilters);
      discoverStateContainer.actions.fetchData();
    });

    const inputSubscription = context.controlGroupAPI
      .getInput$()
      .subscribe(({ initialChildControlState: panels }) => {
        if (!deepEqual(panels, context.controlPanels)) {
          send({ type: 'UPDATE_CONTROL_PANELS', controlPanels: panels });
        }
      });

    return () => {
      filtersSubscription.unsubscribe();
      inputSubscription.unsubscribe();
    };
  };

export const updateControlPanels =
  (): InvokeCreator<LogsExplorerControllerContext, LogsExplorerControllerEvent> =>
  async (context, event) => {
    if (!('controlGroupAPI' in context)) return;
    if (!('discoverStateContainer' in context)) return;
    const { discoverStateContainer } = context;

    const newControlPanels =
      ('controlPanels' in event && event.controlPanels) || context.controlPanels;

    if (!newControlPanels) return undefined;

    const controlPanelsWithId = constructControlPanelsWithDataViewId(
      discoverStateContainer,
      newControlPanels!
    );

    context.controlGroupAPI.updateInput({ initialChildControlState: controlPanelsWithId });

    return controlPanelsWithId;
  };

const constructControlPanelsWithDataViewId = (
  stateContainer: DiscoverStateContainer,
  newControlPanels: ControlPanels
) => {
  const dataView = stateContainer.internalState.getState().dataView!;

  const validatedControlPanels = isValidState(newControlPanels)
    ? newControlPanels
    : getVisibleControlPanelsConfig(dataView);

  const controlsPanelsWithId = mergeDefaultPanelsWithControlPanels(
    dataView,
    validatedControlPanels!
  );

  return controlsPanelsWithId;
};

const isValidState = (state: ControlPanels | undefined | null): boolean => {
  return Object.keys(state ?? {}).length > 0 && ControlPanelRT.is(state);
};

const getVisibleControlPanels = (dataView: DataView | undefined) =>
  availableControlPanelFields.filter(
    (panelKey) => dataView?.fields.getByName(panelKey) !== undefined
  );

export const getVisibleControlPanelsConfig = (dataView?: DataView) => {
  return getVisibleControlPanels(dataView).reduce((panelsMap, panelKey) => {
    const config = controlPanelConfigs[panelKey];

    return { ...panelsMap, [panelKey]: config };
  }, {} as ControlPanels);
};

const addDataViewIdToControlPanels = (controlPanels: ControlPanels, dataViewId: string = '') => {
  return mapValues(controlPanels, (controlPanelConfig) => ({
    ...controlPanelConfig,
    dataViewId,
  }));
};

const mergeDefaultPanelsWithControlPanels = (dataView: DataView, urlPanels: ControlPanels) => {
  // Get default panel configs from existing fields in data view
  const visiblePanels = getVisibleControlPanelsConfig(dataView);

  // Get list of panel which can be overridden to avoid merging additional config from url
  const existingKeys = Object.keys(visiblePanels);
  const controlPanelsToOverride = pick(urlPanels, existingKeys);

  // Merge default and existing configs and add dataView.id to each of them
  return addDataViewIdToControlPanels(
    { ...visiblePanels, ...controlPanelsToOverride },
    dataView.id
  );
};

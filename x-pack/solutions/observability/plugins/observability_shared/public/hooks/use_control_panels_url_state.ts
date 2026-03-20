/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pick } from 'lodash';
import { fold } from 'fp-ts/Either';
import { constant, identity, pipe } from 'fp-ts/function';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useMemo } from 'react';
import {
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import { useUrlState } from './use_url_state';

const CONTROL_PANELS_URL_KEY = 'controlPanels';

const PanelRT = rt.intersection([
  rt.type({
    order: rt.number,
    type: rt.string,
  }),
  rt.partial({
    width: rt.union([rt.literal('medium'), rt.literal('small'), rt.literal('large')]),
    grow: rt.boolean,
    dataViewId: rt.string,
    fieldName: rt.string,
    title: rt.union([rt.string, rt.undefined]),
    selectedOptions: rt.array(rt.union([rt.string, rt.number])),
    exclude: rt.boolean,
    existsSelected: rt.boolean,
  }),
]);

const ControlPanelRT = rt.record(rt.string, PanelRT);
export type ControlPanels = rt.TypeOf<typeof ControlPanelRT>;

const getVisibleControlPanels = (
  availableControlPanelFields: string[],
  dataView: DataView | undefined
) => {
  return availableControlPanelFields.filter(
    (panelKey) => dataView?.fields.getByName(panelKey) !== undefined
  );
};

const getVisibleControlPanelsConfig = (
  controlPanelConfigs: ControlPanels,
  dataView: DataView | undefined
) => {
  return getVisibleControlPanels(Object.keys(controlPanelConfigs), dataView).reduce(
    (panelsMap, panelKey) => {
      const config = controlPanelConfigs[panelKey];

      return { ...panelsMap, [panelKey]: config };
    },
    {} as ControlPanels
  );
};

/**
 * Normalizes panel config keys from camelCase (used in URL state) to snake_case
 * (expected by the controls plugin's state manager).
 */
const normalizePanelConfig = (
  config: ControlPanels[string]
): ControlPanels[string] & Record<string, unknown> => {
  const { fieldName, selectedOptions, existsSelected, ...rest } = config;
  return {
    ...rest,
    ...(fieldName !== undefined && { field_name: fieldName }),
    ...(selectedOptions !== undefined && { selected_options: selectedOptions }),
    ...(existsSelected !== undefined && { exists_selected: existsSelected }),
  };
};

const addDataViewIdToControlPanels = (controlPanels: ControlPanels, dataViewId: string = '') => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    return {
      ...acc,
      [key]: {
        ...normalizePanelConfig(controlPanelConfig),
        data_view_id: dataViewId,
      },
    };
  }, {});
};

// Ensure the final value has the correct control type values in case we're dealing with an older URL state
// that still has old string values instead of the new constants.
const ensureCorrectControlTypes = (controlPanels: ControlPanels) => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    let type: string;

    switch (controlPanelConfig.type) {
      case 'optionsListControl':
        type = OPTIONS_LIST_CONTROL;
        break;
      case 'timeSlider':
        type = TIME_SLIDER_CONTROL;
        break;
      case 'rangeSliderControl':
        type = RANGE_SLIDER_CONTROL;
        break;
      case 'esqlControl':
        type = ESQL_CONTROL;
        break;
      default:
        type = controlPanelConfig.type;
    }

    return {
      ...acc,
      [key]: {
        ...controlPanelConfig,
        type,
      },
    };
  }, {});
};

/**
 * Converts a panel's serialized state (snake_case from the controls plugin) back to
 * the camelCase keys expected by the PanelRT io-ts codec, and strips data view IDs
 * so the URL state remains portable across data views.
 */
const cleanControlPanels = (controlPanels: ControlPanels) => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    const {
      dataViewId,
      data_view_id: _dataViewId,
      field_name,
      selected_options,
      exists_selected,
      ...rest
    } = controlPanelConfig as ControlPanels[string] & Record<string, unknown>;
    return {
      ...acc,
      [key]: {
        ...rest,
        ...(field_name !== undefined && { fieldName: field_name }),
        ...(selected_options !== undefined && { selectedOptions: selected_options }),
        ...(exists_selected !== undefined && { existsSelected: exists_selected }),
      },
    };
  }, {});
};

const mergeDefaultPanelsWithUrlConfig = (
  dataView: DataView,
  urlPanels: ControlPanels = {},
  controlPanelConfigs: ControlPanels
) => {
  // Get default panel configs from existing fields in data view
  const visiblePanels = getVisibleControlPanelsConfig(controlPanelConfigs, dataView);

  // Get list of panel which can be overridden to avoid merging additional config from url
  const existingKeys = Object.keys(visiblePanels);
  const controlPanelsToOverride = pick(urlPanels, existingKeys);

  // Per-property merge: config defaults (e.g. fieldName) are preserved while
  // URL overrides (e.g. selectedOptions) are applied on top.
  const merged: ControlPanels = existingKeys.reduce((acc, key) => {
    return {
      ...acc,
      [key]: {
        ...visiblePanels[key],
        ...(controlPanelsToOverride[key] ?? {}),
      },
    };
  }, {});

  // Merge default and existing configs, add dataView.id to each of them and ensure control types have correct values
  return ensureCorrectControlTypes(addDataViewIdToControlPanels(merged, dataView.id));
};

const encodeUrlState = (value: ControlPanels) => {
  if (value) {
    // Remove the dataView.id on update to make the control panels portable between data views
    const cleanPanels = cleanControlPanels(value);

    return ControlPanelRT.encode(cleanPanels);
  }
};

const decodeUrlState = (value: unknown) => {
  if (value) {
    return pipe(ControlPanelRT.decode(value), fold(constant({}), identity));
  }
};

export const useControlPanels = (
  controlPanelConfigs: ControlPanels,
  dataView: DataView | undefined
): [ControlPanels, (state: ControlPanels) => void] => {
  const defaultState = useMemo(
    () => getVisibleControlPanelsConfig(controlPanelConfigs, dataView),
    [controlPanelConfigs, dataView]
  );

  const [controlPanels, setControlPanels] = useUrlState<ControlPanels>({
    defaultState,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: CONTROL_PANELS_URL_KEY,
  });

  /**
   * Configure the control panels as
   * 1. Available fields from the data view
   * 2. Existing filters from the URL parameter (not colliding with allowed fields from data view)
   * 3. Enhanced with dataView.id
   */
  const controlsPanelsWithId = dataView
    ? mergeDefaultPanelsWithUrlConfig(dataView, controlPanels, controlPanelConfigs)
    : ({} as ControlPanels);

  return [controlsPanelsWithId, setControlPanels];
};

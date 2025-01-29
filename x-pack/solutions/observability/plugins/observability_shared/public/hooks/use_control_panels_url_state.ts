/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pick } from 'lodash';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useMemo } from 'react';
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
    selectedOptions: rt.array(rt.string),
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

const addDataViewIdToControlPanels = (controlPanels: ControlPanels, dataViewId: string = '') => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    return {
      ...acc,
      [key]: {
        ...controlPanelConfig,
        dataViewId,
      },
    };
  }, {});
};

const cleanControlPanels = (controlPanels: ControlPanels) => {
  return Object.entries(controlPanels).reduce((acc, [key, controlPanelConfig]) => {
    const { dataViewId, ...rest } = controlPanelConfig;
    return {
      ...acc,
      [key]: rest,
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

  // Merge default and existing configs and add dataView.id to each of them
  return addDataViewIdToControlPanels(
    { ...visiblePanels, ...controlPanelsToOverride },
    dataView.id
  );
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

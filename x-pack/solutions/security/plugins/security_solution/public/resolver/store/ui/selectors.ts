/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';

import { createSelector } from 'reselect';
import type { PanelViewAndParameters, ResolverUIState } from '../../types';
import { panelViewAndParameters as panelViewAndParametersFromLocationSearchAndResolverComponentInstanceID } from '../panel_view_and_parameters';
import { parameterName } from '../parameter_name';

/**
 * id of the "current" tree node (fake-focused)
 */
export const ariaActiveDescendant = createSelector(
  (uiState: ResolverUIState) => uiState,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  ({ ariaActiveDescendant }) => {
    return ariaActiveDescendant;
  }
);

/**
 * id of the currently "selected" tree node
 */
export const selectedNode = createSelector(
  (uiState: ResolverUIState) => uiState,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  ({ selectedNode }: ResolverUIState) => {
    return selectedNode;
  }
);

/**
 * Which view should show in the panel, as well as what parameters should be used.
 * Calculated using the query string
 */
export const panelViewAndParameters = createSelector(
  (state: ResolverUIState) => state.locationSearch,
  (state: ResolverUIState) => state.resolverComponentInstanceID,
  (locationSearch, resolverComponentInstanceID) => {
    return panelViewAndParametersFromLocationSearchAndResolverComponentInstanceID({
      locationSearch,
      resolverComponentInstanceID,
    });
  }
);

/**
 * Return a relative href (which includes just the 'search' part) that contains an encoded version of `params `.
 * All other values in the 'search' will be kept.
 * Use this to get an `href` for an anchor tag.
 */
export const relativeHref: (
  state: ResolverUIState
) => (params: PanelViewAndParameters) => string | undefined = createSelector(
  (state: ResolverUIState) => state.locationSearch,
  (state: ResolverUIState) => state.resolverComponentInstanceID,
  (locationSearch, resolverComponentInstanceID) => {
    return (params: PanelViewAndParameters) => {
      /**
       * This is only possible before the first `'appReceivedNewExternalProperties'` action is fired.
       */
      if (locationSearch === undefined || resolverComponentInstanceID === undefined) {
        return undefined;
      }
      const urlSearchParams = new URLSearchParams(locationSearch);
      const value = encode(params);
      urlSearchParams.set(parameterName(resolverComponentInstanceID), value);
      return `?${urlSearchParams.toString()}`;
    };
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, MiddlewareAPI } from 'redux';
import { isEqual } from 'lodash';
import type { SafeResolverEvent } from '../../../../common/endpoint/types';

import type { DataAccessLayer, PanelViewAndParameters } from '../../types';
import type { State } from '../../../common/store/types';
import * as selectors from '../selectors';
import {
  appRequestedCurrentRelatedEventData,
  serverFailedToReturnCurrentRelatedEventData,
  serverReturnedCurrentRelatedEventData,
} from '../data/action';

/**
 *
 * @description - This api is called after every state change.
 * If the current view is the `eventDetail` view it will request the event details from the server.
 * @export
 * @param {DataAccessLayer} dataAccessLayer
 * @param {MiddlewareAPI<Dispatch<Action>, State>} api
 * @returns {() => void}
 */
export function CurrentRelatedEventFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch, State>
): (id: string) => void {
  const last: { [id: string]: PanelViewAndParameters | undefined } = {};
  return async (id: string) => {
    const state = api.getState();

    if (!last[id]) {
      last[id] = undefined;
    }
    const newParams = selectors.panelViewAndParameters(state.analyzer[id]);
    const indices = selectors.eventIndices(state.analyzer[id]);

    const oldParams = last[id];
    last[id] = newParams;

    // If the panel view params have changed and the current panel view is the `eventDetail`, then fetch the event details for that eventID.
    if (!isEqual(newParams, oldParams) && newParams.panelView === 'eventDetail') {
      const currentEventID = newParams.panelParameters.eventID;
      const currentNodeID = newParams.panelParameters.nodeID;
      const currentEventCategory = newParams.panelParameters.eventCategory;
      const currentEventTimestamp = newParams.panelParameters.eventTimestamp;
      const winlogRecordID = newParams.panelParameters.winlogRecordID;

      api.dispatch(appRequestedCurrentRelatedEventData({ id }));
      const detectedBounds = selectors.detectedBounds(state.analyzer[id]);
      const agentId = selectors.agentId(state.analyzer[id]);
      const timeRangeFilters =
        detectedBounds !== undefined ? undefined : selectors.timeRangeFilters(state.analyzer[id]);
      let result: SafeResolverEvent | null = null;
      try {
        result = await dataAccessLayer.event({
          nodeID: currentNodeID,
          eventCategory: [currentEventCategory],
          eventTimestamp: currentEventTimestamp,
          eventID: currentEventID,
          winlogRecordID,
          indexPatterns: indices,
          timeRange: timeRangeFilters,
          agentId,
        });
      } catch (error) {
        api.dispatch(serverFailedToReturnCurrentRelatedEventData({ id }));
      }

      if (result) {
        api.dispatch(serverReturnedCurrentRelatedEventData({ id, relatedEvent: result }));
      } else {
        api.dispatch(serverFailedToReturnCurrentRelatedEventData({ id }));
      }
    }
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, MiddlewareAPI } from 'redux';
import { isEqual } from 'lodash';
import type { ResolverPaginatedEvents } from '../../../../common/endpoint/types';

import type { DataAccessLayer, PanelViewAndParameters } from '../../types';
import * as selectors from '../selectors';
import type { State } from '../../../common/store/types';
import {
  serverFailedToReturnNodeEventsInCategory,
  serverReturnedNodeEventsInCategory,
} from '../data/action';

export function RelatedEventsFetcher(
  dataAccessLayer: DataAccessLayer,
  api: MiddlewareAPI<Dispatch, State>
): (id: string) => void {
  const last: { [id: string]: PanelViewAndParameters | undefined } = {};
  // Call this after each state change.
  // This fetches the ResolverTree for the current entityID
  // if the entityID changes while
  return async (id: string) => {
    const state = api.getState();

    if (!last[id]) {
      last[id] = undefined;
    }
    const newParams = selectors.panelViewAndParameters(state.analyzer[id]);
    const isLoadingMoreEvents = selectors.isLoadingMoreNodeEventsInCategory(state.analyzer[id]);
    const indices = selectors.eventIndices(state.analyzer[id]);

    const oldParams = last[id];
    const detectedBounds = selectors.detectedBounds(state.analyzer[id]);
    const agentId = selectors.agentId(state.analyzer[id]);
    const timeRangeFilters =
      detectedBounds !== undefined ? undefined : selectors.timeRangeFilters(state.analyzer[id]);
    // Update this each time before fetching data (or even if we don't fetch data) so that subsequent actions that call this (concurrently) will have up to date info.
    last[id] = newParams;

    async function fetchEvents({
      nodeID,
      eventCategory,
      cursor,
    }: {
      nodeID: string;
      eventCategory: string;
      cursor: string | null;
    }) {
      let result: ResolverPaginatedEvents | null = null;

      try {
        if (cursor) {
          result = await dataAccessLayer.eventsWithEntityIDAndCategory({
            entityID: nodeID,
            category: eventCategory,
            after: cursor,
            indexPatterns: indices,
            timeRange: timeRangeFilters,
            agentId,
          });
        } else {
          result = await dataAccessLayer.eventsWithEntityIDAndCategory({
            entityID: nodeID,
            category: eventCategory,
            indexPatterns: indices,
            timeRange: timeRangeFilters,
            agentId,
          });
        }
      } catch (error) {
        api.dispatch(
          serverFailedToReturnNodeEventsInCategory({ id, nodeID, eventCategory, cursor })
        );
      }

      if (result) {
        api.dispatch(
          serverReturnedNodeEventsInCategory({
            id,
            events: result.events,
            eventCategory,
            cursor: result.nextEvent,
            nodeID,
            agentId,
          })
        );
      }
    }

    // If the panel view params have changed and the current panel view is either `nodeEventsInCategory` or `eventDetail`, then fetch the related events for that nodeID.
    if (!isEqual(newParams, oldParams)) {
      if (newParams.panelView === 'nodeEventsInCategory') {
        const nodeID = newParams.panelParameters.nodeID;
        await fetchEvents({
          nodeID,
          eventCategory: newParams.panelParameters.eventCategory,
          cursor: null,
        });
      }
    } else if (isLoadingMoreEvents) {
      const nodeEventsInCategory = state.analyzer[id].data.nodeEventsInCategory;
      if (nodeEventsInCategory !== undefined) {
        await fetchEvents(nodeEventsInCategory);
      }
    }
  };
}

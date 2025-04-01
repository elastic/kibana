/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type {
  NewResolverTree,
  SafeEndpointEvent,
  SafeResolverEvent,
  ResolverSchema,
} from '../../../../common/endpoint/types';
import type { TreeFetcherParameters, PanelViewAndParameters, TimeFilters } from '../../types';

const actionCreator = actionCreatorFactory('x-pack/security_solution/analyzer');

export const serverReturnedResolverData = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  id: string;
  /**
   * The result of fetching data
   */
  result: NewResolverTree;
  /**
   * The current data source (i.e. endpoint, winlogbeat, etc...)
   */
  dataSource: string;
  /**
   * The Resolver Schema for the current data source
   */
  schema: ResolverSchema;
  /**
   * The database parameters that was used to fetch the resolver tree
   */
  parameters: TreeFetcherParameters;

  /**
   * If the user supplied date range results in 0 process events,
   *  an unbounded request is made, and the time range of the result set displayed to the user through this value.
   */
  detectedBounds?: TimeFilters;
}>('SERVER_RETURNED_RESOLVER_DATA');

export const appRequestedNodeEventsInCategory = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  parameters: PanelViewAndParameters;
}>('APP_REQUESTED_NODE_EVENTS_IN_CATEGORY');

export const appRequestedResolverData = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * entity ID used to make the request.
   */
  readonly parameters: TreeFetcherParameters;
}>('APP_REQUESTED_RESOLVER_DATA');

export const userRequestedAdditionalRelatedEvents = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
}>('USER_REQUESTED_ADDITIONAL_RELATED_EVENTS');

export const serverFailedToReturnNodeEventsInCategory = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * The cursor, if any, that can be used to retrieve more events.
   */
  readonly cursor: string | null;
  /**
   * The nodeID that `events` are related to.
   */
  readonly nodeID: string;
  /**
   * The category that `events` have in common.
   */
  readonly eventCategory: string;
}>('SERVER_FAILED_TO_RETUEN_NODE_EVENTS_IN_CATEGORY');

export const serverFailedToReturnResolverData = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * entity ID used to make the failed request
   */
  readonly parameters: TreeFetcherParameters;
}>('SERVER_FAILED_TO_RETURN_RESOLVER_DATA');

export const appAbortedResolverDataRequest = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * entity ID used to make the aborted request
   */
  readonly parameters: TreeFetcherParameters;
}>('APP_ABORTED_RESOLVER_DATA_REQUEST');

export const serverReturnedNodeEventsInCategory = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * Events with `event.category` that include `eventCategory` and that are related to `nodeID`.
   */
  readonly events: SafeEndpointEvent[];
  /**
   * The cursor, if any, that can be used to retrieve more events.
   */
  readonly cursor: string | null;
  /**
   * The nodeID that `events` are related to.
   */
  readonly nodeID: string;
  /**
   * The category that `events` have in common.
   */
  readonly eventCategory: string;

  readonly agentId: string;
}>('SERVER_RETURNED_NODE_EVENTS_IN_CATEGORY');

/**
 * When events are returned for a set of graph nodes. For Endpoint graphs the events returned are process lifecycle events.
 */
export const serverReturnedNodeData = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * A map of the node's ID to an array of events
   */
  readonly nodeData: SafeResolverEvent[];
  /**
   * The list of IDs that were originally sent to the server. This won't necessarily equal nodeData.keys() because
   * data could have been deleted in Elasticsearch since the original graph nodes were returned or the server's
   * API limit could have been reached.
   */
  readonly requestedIDs: Set<string>;
  /**
   * The number of events that we requested from the server (the limit in the request).
   * This will be used to compute a flag about whether we reached the limit with the number of events returned by
   * the server. If the server returned the same amount of data we requested, then
   * we might be missing events for some of the requested node IDs. We'll mark those nodes in such a way
   * that we'll request their data in a subsequent request.
   */
  readonly numberOfRequestedEvents: number;
}>('SERVER_RETURNED_NODE_DATA');

/**
 * When the middleware kicks off the request for node data to the server.
 */
export const appRequestingNodeData = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * The list of IDs that will be sent to the server to retrieve data for.
   */
  requestedIDs: Set<string>;
}>('APP_REQUESTING_NODE_DATA');

/**
 * When the user clicks on a node that was in an error state to reload the node data.
 */
export const userReloadedResolverNode = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * The nodeID (aka entity_id) that was select.
   */
  readonly nodeID: string;
}>('USER_RELOADED_RESOLVER_NODE');

export const userOverrodeDateRange = actionCreator<{
  readonly id: string;
  readonly timeRange: TimeFilters;
}>('USER_OVERRODE_DATE_RANGE');

export const userOverrodeSourcererSelection = actionCreator<{
  readonly id: string;
  readonly indices: string[];
}>('USER_OVERRODE_SOURCERER_SELECTION');

/**
 * When the server returns an error after the app requests node data for a set of nodes.
 */
export const serverFailedToReturnNodeData = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * The list of IDs that were sent to the server to retrieve data for.
   */
  readonly requestedIDs: Set<string>;
}>('SERVER_FAILED_TO_RETURN_NODE_DATA');

export const appRequestedCurrentRelatedEventData = actionCreator<{ readonly id: string }>(
  'APP_REQUESTED_CURRENT_RELATED_EVENT_DATA'
);

export const serverFailedToReturnCurrentRelatedEventData = actionCreator<{ readonly id: string }>(
  'SERVER_FAILED_TO_RETURN_CURRENT_RELATED_EVENT_DATA'
);

export const serverReturnedCurrentRelatedEventData = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  readonly relatedEvent: SafeResolverEvent;
}>('SERVER_RETURNED_CURRENT_RELATED_EVENT_DATA');

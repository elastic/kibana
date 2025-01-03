/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('x-pack/security_solution/analyzer');

export const createResolver = actionCreator<{ id: string }>('CREATE_RESOLVER');

export const clearResolver = actionCreator<{ id: string }>('CLEAR_RESOLVER');

/**
 * The action dispatched when the app requests related event data for one
 * subject (whose entity_id should be included as `payload`)
 */
export const userRequestedRelatedEventData = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  id: string;
  readonly nodeID: string;
}>('REQUEST_RELATED_EVENT');

/**
 * When the user switches the "active descendant" of the Resolver.
 * The "active descendant" (from the point of view of the parent element)
 * corresponds to the "current" child element. "active" or "current" here meaning
 * the element that is focused on by the user's interactions with the UI, but
 * not necessarily "selected" (see UserSelectedResolverNode below)
 */
export const userFocusedOnResolverNode = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * Used to identify the node that should be brought into view.
   */
  readonly nodeID: string;
  /**
   * The time (since epoch in milliseconds) when the action was dispatched.
   */
  readonly time: number;
}>('FOCUS_ON_NODE');

/**
 * When the user "selects" a node in the Resolver
 * "Selected" refers to the state of being the element that the
 * user most recently "picked" (by e.g. pressing a button corresponding
 * to the element in a list) as opposed to "active" or "current" (see UserFocusedOnResolverNode above).
 */
export const userSelectedResolverNode = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * Used to identify the node that should be brought into view.
   */
  readonly nodeID: string;
  /**
   * The time (since epoch in milliseconds) when the action was dispatched.
   */
  readonly time: number;
}>('SELECT_RESOLVER_NODE');

/**
 * Used by `useStateSyncingActions` hook.
 * This is dispatched when external sources provide new parameters for Resolver.
 * When the component receives a new 'databaseDocumentID' prop, this is fired.
 */
export const appReceivedNewExternalProperties = actionCreator<{
  /**
   * Id that identify the scope of analyzer
   */
  readonly id: string;
  /**
   * the `_id` of an ES document. This defines the origin of the Resolver graph.
   */
  readonly databaseDocumentID: string;
  /**
   * An ID that uniquely identifies this Resolver instance from other concurrent Resolvers.
   */
  readonly resolverComponentInstanceID: string;

  /**
   * The `search` part of the URL of this page.
   */
  readonly locationSearch: string;

  /**
   * Indices that the backend will use to find the document.
   */
  readonly indices: string[];

  readonly shouldUpdate: boolean;
  readonly filters: {
    from?: string;
    to?: string;
  };
}>('APP_RECEIVED_NEW_EXTERNAL_PROPERTIES');

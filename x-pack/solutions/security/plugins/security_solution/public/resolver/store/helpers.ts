/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Draft } from 'immer';
import produce from 'immer';
import type { Reducer, AnyAction } from 'redux';
import type { ActionCreator } from 'typescript-fsa';
import type { ReducerBuilder } from 'typescript-fsa-reducers';
import type { ResolverState, AnalyzerById } from '../types';
import { scaleToZoom } from './camera/scale_to_zoom';
import { analyzerReducer } from './reducer';

export const EMPTY_RESOLVER: ResolverState = {
  data: {
    currentRelatedEvent: {
      loading: false,
      data: null,
    },
    tree: {},
    resolverComponentInstanceID: undefined,
    indices: [],
    detectedBounds: undefined,
  },
  camera: {
    scalingFactor: scaleToZoom(1), // Defaulted to 1 to 1 scale
    rasterSize: [0, 0],
    translationNotCountingCurrentPanning: [0, 0],
    latestFocusedWorldCoordinates: null,
    animation: undefined,
    panning: undefined,
  },
  ui: {
    ariaActiveDescendant: null,
    selectedNode: null,
  },
};

/**
 * Helper function to support use of immer within action creators.
 * This allows reducers to be written in immer (direct mutation in appearance) over spread operators.
 * More information on immer: https://immerjs.github.io/immer/
 * @param actionCreator action creator
 * @param handler reducer written in immer
 * @returns reducer builder
 */
export function immerCase<S, P>(
  actionCreator: ActionCreator<P>,
  handler: (draft: Draft<S>, payload: P) => void
): (reducer: ReducerBuilder<S>) => ReducerBuilder<S> {
  return (reducer) =>
    reducer.case(actionCreator, (state, payload) =>
      produce(state, (draft) => handler(draft, payload))
    );
}

export const initialAnalyzerState: AnalyzerById = {};

export function mockReducer(id: string): Reducer<AnalyzerById, AnyAction> {
  const testReducer: Reducer<AnalyzerById, AnyAction> = (
    state = { [id]: EMPTY_RESOLVER },
    action
  ): AnalyzerById => analyzerReducer(state, action);
  return testReducer;
}

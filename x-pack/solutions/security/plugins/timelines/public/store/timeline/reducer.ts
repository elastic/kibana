/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { addProviderToTimeline } from './actions';
import { addProviderToTimelineHelper } from './helpers';

export const initialTimelineState = {
  timelineById: {},
};

export const timelineReducer = reducerWithInitialState(initialTimelineState)
  .case(addProviderToTimeline, (state, { id, dataProvider }) => ({
    ...state,
    timelineById: addProviderToTimelineHelper(id, dataProvider, state.timelineById),
  }))
  .build();

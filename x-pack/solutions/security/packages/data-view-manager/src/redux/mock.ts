/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID } from '../constants';
import { initialDataViewManagerState, type RootState } from './reducer';

/** The timeline scope data view id used by the mock state; exported so tests can assert on it
 * without reaching into the state shape. */
export const mockTimelineDataViewId = 'mock-timeline-data-view';

const dataViewManagerState = structuredClone(initialDataViewManagerState).dataViewManager;

export const mockDataViewManagerState: RootState = {
  dataViewManager: {
    ...dataViewManagerState,
    timeline: {
      ...dataViewManagerState.timeline,
      dataViewId: mockTimelineDataViewId,
      status: 'ready',
    },
    default: {
      ...dataViewManagerState.default,
      dataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      status: 'ready',
    },
    analyzer: {
      ...dataViewManagerState.analyzer,
      dataViewId: DEFAULT_SECURITY_SOLUTION_DATA_VIEW_ID,
      status: 'ready',
    },
  },
};

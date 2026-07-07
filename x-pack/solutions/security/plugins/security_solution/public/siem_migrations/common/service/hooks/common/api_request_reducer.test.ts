/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducer, initialState } from './api_request_reducer';
import type { State, Action } from './api_request_reducer';

describe('API Request Reducer', () => {
  it('should return the initial state for an unhandled action', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(reducer(initialState, { type: 'unhandled' } as any)).toEqual(initialState);
  });

  it('should handle the "start" action', () => {
    const action: Action = { type: 'start' };
    const expectedState: State = { loading: true, error: null };
    expect(reducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle the "error" action', () => {
    const error = new Error('Test error');
    const action: Action = { type: 'error', error };
    const expectedState: State = { loading: false, error };
    const stateWithLoading = { ...initialState, loading: true };
    expect(reducer(stateWithLoading, action)).toEqual(expectedState);
  });

  it('should handle the "success" action', () => {
    const action: Action = { type: 'success' };
    const expectedState: State = { loading: false, error: null };
    const stateWithLoading = { ...initialState, loading: true };
    expect(reducer(stateWithLoading, action)).toEqual(expectedState);
  });

  it('should return the current state for unknown actions', () => {
    const currentState: State = { loading: true, error: null };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(reducer(currentState, { type: 'unknown' } as any)).toEqual(currentState);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { State } from './reducer';
import { createAlertTagsReducer } from './reducer';

const initialState: State = {
  selectableAlertTags: [],
  tagsToAdd: new Set<string>(['False positive']),
  tagsToRemove: new Set<string>(['Duplicate']),
};

describe('createAlertTagsReducer', () => {
  it('should update state on addAlertTag action', () => {
    const reducer = createAlertTagsReducer();
    const state = reducer(initialState, { type: 'addAlertTag', value: 'Duplicate' });

    expect(Array.from(state.tagsToAdd)).toEqual(['False positive', 'Duplicate']);
    expect(Array.from(state.tagsToRemove)).toEqual([]);

    // reducer action must not mutate previous state
    expect(state.tagsToAdd).not.toBe(initialState.tagsToAdd);
    expect(state.tagsToRemove).not.toBe(initialState.tagsToRemove);
    expect(state).not.toBe(initialState);
  });
  it('should update state on removeAlertTag action', () => {
    const reducer = createAlertTagsReducer();
    const state = reducer(initialState, { type: 'removeAlertTag', value: 'False positive' });

    expect(Array.from(state.tagsToRemove)).toEqual(['Duplicate', 'False positive']);
    expect(Array.from(state.tagsToAdd)).toEqual([]);

    // reducer action must not mutate previous state
    expect(state.tagsToRemove).not.toBe(initialState.tagsToRemove);
    expect(state.tagsToAdd).not.toBe(initialState.tagsToAdd);
    expect(state).not.toBe(initialState);
  });
  it('should update state on setSelectableAlertTags action', () => {
    const reducer = createAlertTagsReducer();
    const state = reducer(initialState, {
      type: 'setSelectableAlertTags',
      value: [{ label: 'Duplicate' }],
    });

    expect(state.selectableAlertTags).toEqual([{ label: 'Duplicate' }]);
    // reducer action must not mutate previous state
    expect(state).not.toBe(initialState);
  });
});

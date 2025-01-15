/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux-actions';
import {
  getSelectedFilters,
  setSelectedFilters,
  SelectedFilters,
} from '../actions/selected_filters';

const initialState: SelectedFilters | null = null;

export function selectedFiltersReducer(
  state = initialState,
  action: Action<any>
): SelectedFilters | null {
  switch (action.type) {
    case String(setSelectedFilters):
      if (action.payload === null) return null;
      return {
        ...action.payload,
      };
    case String(getSelectedFilters):
    default:
      return state;
  }
}

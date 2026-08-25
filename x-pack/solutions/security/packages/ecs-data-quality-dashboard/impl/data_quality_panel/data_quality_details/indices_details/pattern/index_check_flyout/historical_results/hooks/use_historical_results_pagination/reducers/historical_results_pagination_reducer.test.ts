/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { historicalResultsPaginationReducer } from './historical_results_pagination_reducer';

describe('historicalResultsPaginationReducer', () => {
  describe('on SET_ROW_SIZE', () => {
    it('should set rowSize and pageCount and reset activePage to 0', () => {
      const state = { rowSize: 10, pageCount: 1, activePage: 0 };
      const action = { type: 'SET_ROW_SIZE' as const, payload: { rowSize: 5, totalResults: 11 } };
      const newState = historicalResultsPaginationReducer(state, action);
      expect(newState).toEqual({ rowSize: 5, pageCount: 3, activePage: 0 });
    });
  });

  describe('on SET_ACTIVE_PAGE', () => {
    it('should set activePage', () => {
      const state = { rowSize: 10, pageCount: 1, activePage: 0 };
      const action = { type: 'SET_ACTIVE_PAGE' as const, payload: 1 };
      const newState = historicalResultsPaginationReducer(state, action);
      expect(newState).toEqual({ rowSize: 10, pageCount: 1, activePage: 1 });
    });
  });

  describe('on unknown action', () => {
    it('should return the state', () => {
      const state = { rowSize: 10, pageCount: 1, activePage: 0 };
      const action = { type: 'UNKNOWN_ACTION' };
      // @ts-expect-error
      const newState = historicalResultsPaginationReducer(state, action);
      expect(newState).toEqual(state);
    });
  });
});

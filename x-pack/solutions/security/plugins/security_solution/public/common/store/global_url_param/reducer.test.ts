/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deregisterUrlParam, registerUrlParam, updateUrlParam } from './actions';
import { globalUrlParamReducer, initialGlobalUrlParam } from './reducer';

const error = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('globalUrlParamReducer', () => {
  describe('#registerUrlParam', () => {
    it('registers the URL param', () => {
      const key = 'testKey';
      const initialValue = 'testValue';
      const state = globalUrlParamReducer(
        initialGlobalUrlParam,
        registerUrlParam({ key, initialValue })
      );

      expect(state).toEqual({ [key]: initialValue });
    });

    it('throws exception when a key is register twice', () => {
      const key = 'testKey';
      const initialValue = 'testValue';
      const newState = globalUrlParamReducer(
        initialGlobalUrlParam,
        registerUrlParam({ key, initialValue })
      );

      globalUrlParamReducer(newState, registerUrlParam({ key, initialValue }));

      expect(error).toHaveBeenCalledWith("Url param key 'testKey' is already being used.");
    });
  });

  describe('#deregisterUrlParam', () => {
    it('deregisters the URL param', () => {
      const key = 'testKey';
      const initialValue = 'testValue';
      let state = globalUrlParamReducer(
        initialGlobalUrlParam,
        registerUrlParam({ key, initialValue })
      );

      expect(state).toEqual({ [key]: initialValue });

      state = globalUrlParamReducer(initialGlobalUrlParam, deregisterUrlParam({ key }));

      expect(state).toEqual({});
    });
  });

  describe('#updateUrlParam', () => {
    it('updates URL param', () => {
      const key = 'testKey';
      const value = 'new test value';

      const state = globalUrlParamReducer(
        { [key]: 'old test value' },
        updateUrlParam({ key, value })
      );

      expect(state).toEqual({ [key]: value });
    });

    it("doesn't update the URL param if key isn't registered", () => {
      const key = 'testKey';
      const value = 'testValue';

      const state = globalUrlParamReducer(initialGlobalUrlParam, updateUrlParam({ key, value }));

      expect(state).toEqual(initialGlobalUrlParam);
    });

    it("doesn't update the state if new value is equal to store value", () => {
      const key = 'testKey';
      const value = 'testValue';
      const intialState = { [key]: value };

      const state = globalUrlParamReducer(intialState, updateUrlParam({ key, value }));

      expect(state).toBe(intialState);
    });
  });
});

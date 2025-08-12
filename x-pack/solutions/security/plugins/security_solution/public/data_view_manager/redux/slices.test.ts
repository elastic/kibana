/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import {
  sharedDataViewManagerSlice,
  createDataViewSelectionSlice,
  initialSharedState,
  initialScopeState,
} from './slices';
import { selectDataViewAsync } from './actions';
import { DataViewManagerScopeName } from '../constants';

describe('slices', () => {
  describe('dataViewSelectionSlice', () => {});

  describe('sharedDataViewManagerSlice', () => {
    const { reducer, actions } = sharedDataViewManagerSlice;

    describe('setDataViews', () => {
      it('should set dataViews and change status to ready', () => {
        const dataViews = [{ id: '1', title: 'test view' }];

        const state = reducer(initialSharedState, actions.setDataViews(dataViews));

        expect(state.dataViews).toEqual(dataViews);
        expect(state.status).toBe('ready');
      });
    });

    describe('addDataView', () => {
      it('should add a persisted data view', () => {
        const newDataView = {
          id: '1',
          title: 'new view',
          isPersisted: () => true,
          toSpec: () => ({ id: '1', title: 'new view' }),
        } as unknown as DataView;

        const state = reducer(initialSharedState, actions.addDataView(newDataView));

        expect(state.dataViews).toHaveLength(1);
        expect(state.dataViews[0]).toEqual({ id: '1', title: 'new view' });
      });

      it('should not add a duplicate persisted data view', () => {
        const initialState = {
          ...initialSharedState,
          dataViews: [{ id: '1', title: 'test view' }],
        };

        const duplicateDataView = {
          id: '1',
          title: 'duplicate view',
          isPersisted: () => true,
          toSpec: () => ({ id: '1', title: 'duplicate view' }),
        } as unknown as DataView;

        const state = reducer(initialState, actions.addDataView(duplicateDataView));

        expect(state.dataViews).toHaveLength(1);
        expect(state.dataViews[0]).toEqual({ id: '1', title: 'test view' });
      });

      it('should add an ad hoc data view', () => {
        const newDataView = {
          title: 'new ad hoc view',
          isPersisted: () => false,
          toSpec: () => ({ title: 'new ad hoc view' }),
        } as unknown as DataView;

        const state = reducer(initialSharedState, actions.addDataView(newDataView));

        expect(state.adhocDataViews).toHaveLength(1);
        expect(state.adhocDataViews[0]).toEqual({ title: 'new ad hoc view' });
      });

      it('should not add a duplicate ad hoc data view', () => {
        const initialState = {
          ...initialSharedState,
          adhocDataViews: [{ title: 'test ad hoc view' }],
        };

        const duplicateDataView = {
          title: 'test ad hoc view',
          isPersisted: () => false,
          toSpec: () => ({ title: 'test ad hoc view' }),
        } as unknown as DataView;

        const state = reducer(initialState, actions.addDataView(duplicateDataView));

        expect(state.adhocDataViews).toHaveLength(1);
        expect(state.adhocDataViews[0]).toEqual({ title: 'test ad hoc view' });
      });
    });

    describe('state transitions', () => {
      it('should set status to loading when init is called', () => {
        const state = reducer(initialSharedState, actions.init([]));

        expect(state.status).toBe('loading');
      });

      it('should set status to error when error is called', () => {
        const state = reducer(initialSharedState, actions.error());

        expect(state.status).toBe('error');
      });
    });
  });

  describe('createDataViewSelectionSlice', () => {
    const testScope = DataViewManagerScopeName.default;
    const { reducer, actions } = createDataViewSelectionSlice(testScope);

    describe('setSelectedDataView', () => {
      it('should set the data view and change status to ready', () => {
        const dataView = { id: '1', title: 'test view' };

        const state = reducer(initialScopeState, actions.setSelectedDataView(dataView.id));

        expect(state.dataViewId).toEqual(dataView.id);
        expect(state.status).toBe('ready');
      });
    });

    describe('dataViewSelectionError', () => {
      it('should set status to error', () => {
        const state = reducer(initialScopeState, actions.dataViewSelectionError('error message'));

        expect(state.status).toBe('error');
      });
    });

    describe('selectDataViewAsync', () => {
      it('should set status to loading when scope includes the slice scope', () => {
        const state = reducer(
          initialScopeState,
          selectDataViewAsync({
            id: '1',
            scope: testScope,
          })
        );

        expect(state.status).toBe('loading');
      });

      it('should not change state when scope does not include the slice scope', () => {
        const state = reducer(
          initialScopeState,
          selectDataViewAsync({
            id: '1',
            scope: DataViewManagerScopeName.analyzer,
          })
        );

        expect(state).toEqual(initialScopeState);
      });
    });
  });
});

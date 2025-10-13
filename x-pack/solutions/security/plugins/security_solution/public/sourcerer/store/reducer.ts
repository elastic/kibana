/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import {
  setDataView,
  setDataViewLoading,
  setSelectedDataView,
  setSourcererDataViews,
} from './actions';
import type { SourcererModel } from './model';
import { initDataView, initialSourcererState } from './model';
import { validateSelectedPatterns } from './helpers';

export type SourcererState = SourcererModel;

export const sourcererReducer = reducerWithInitialState(initialSourcererState)
  .case(setDataViewLoading, (state, { id, loading }) => ({
    ...state,
    ...(id === state.defaultDataView.id
      ? {
          defaultDataView: { ...state.defaultDataView, loading },
        }
      : {}),
    kibanaDataViews: state.kibanaDataViews.map((dv) => (dv.id === id ? { ...dv, loading } : dv)),
  }))
  .case(setSourcererDataViews, (state, { defaultDataView, kibanaDataViews }) => ({
    ...state,
    defaultDataView: {
      ...state.defaultDataView,
      ...defaultDataView,
    },
    kibanaDataViews: kibanaDataViews.map((dataView) => ({
      ...(state.kibanaDataViews.find(({ id }) => id === dataView.id) ?? initDataView),
      ...dataView,
    })),
  }))
  .case(setSelectedDataView, (state, payload) => {
    const { shouldValidateSelectedPatterns = true, ...patternsInfo } = payload;

    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        ...validateSelectedPatterns(state, patternsInfo, shouldValidateSelectedPatterns),
      },
    };
  })
  .case(setDataView, (state, dataView) => ({
    ...state,
    ...(dataView.id === state.defaultDataView.id
      ? {
          defaultDataView: { ...state.defaultDataView, ...dataView },
        }
      : {}),
    kibanaDataViews: state.kibanaDataViews.map((dv) =>
      dv.id === dataView.id ? { ...dv, ...dataView } : dv
    ),
  }))
  .build();

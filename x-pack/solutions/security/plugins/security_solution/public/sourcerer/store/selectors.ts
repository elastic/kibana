/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSelector } from 'reselect';
import type { State } from '../../common/store/types';
import type { SourcererModel } from './model';
import { SourcererScopeName } from './model';

const SOURCERER_SCOPE_MAX_SIZE = Object.keys(SourcererScopeName).length;

const selectSourcerer = (state: State): SourcererModel => state.sourcerer;

export const sourcererScopes = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.sourcererScopes
);

export const sourcererScope = createSelector(
  sourcererScopes,
  (state: State, scopeId: SourcererScopeName) => scopeId,
  (scopes, scopeId) => scopes[scopeId],
  {
    memoizeOptions: {
      maxSize: SOURCERER_SCOPE_MAX_SIZE,
    },
  }
);

export const sourcererScopeIsLoading = createSelector(sourcererScope, (scope) => scope.loading, {
  memoizeOptions: {
    maxSize: SOURCERER_SCOPE_MAX_SIZE,
  },
});

export const sourcererScopeSelectedDataViewId = createSelector(
  sourcererScope,
  (scope) => scope.selectedDataViewId,
  {
    memoizeOptions: {
      maxSize: SOURCERER_SCOPE_MAX_SIZE,
    },
  }
);

export const sourcererScopeSelectedPatterns = createSelector(
  sourcererScope,
  (scope) => scope.selectedPatterns,
  {
    memoizeOptions: {
      maxSize: SOURCERER_SCOPE_MAX_SIZE,
    },
  }
);

export const sourcererScopeMissingPatterns = createSelector(
  sourcererScope,
  (scope) => scope.missingPatterns,
  {
    memoizeOptions: {
      maxSize: SOURCERER_SCOPE_MAX_SIZE,
    },
  }
);

export const kibanaDataViews = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.kibanaDataViews,
  {
    memoizeOptions: {
      maxSize: SOURCERER_SCOPE_MAX_SIZE,
    },
  }
);

export const defaultDataView = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.defaultDataView,
  {
    memoizeOptions: {
      maxSize: SOURCERER_SCOPE_MAX_SIZE,
    },
  }
);

export const signalIndexName = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.signalIndexName,
  {
    memoizeOptions: {
      maxSize: SOURCERER_SCOPE_MAX_SIZE,
    },
  }
);

export const signalIndexMappingOutdated = createSelector(
  selectSourcerer,
  (sourcerer) => sourcerer.signalIndexMappingOutdated,
  {
    memoizeOptions: {
      maxSize: SOURCERER_SCOPE_MAX_SIZE,
    },
  }
);

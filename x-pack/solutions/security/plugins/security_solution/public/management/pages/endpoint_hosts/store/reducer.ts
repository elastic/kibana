/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointPackageInfoStateChanged, MetadataTransformStatsChanged } from './action';
import {
  getCurrentIsolationRequestState,
  hasSelectedEndpoint,
  isOnEndpointPage,
  uiQueryParams,
} from './selectors';
import type { EndpointState } from '../types';
import { initialEndpointPageState } from './builders';
import type { AppAction } from '../../../../common/store/actions';
import type { ImmutableReducer } from '../../../../common/store';
import type { Immutable } from '../../../../../common/endpoint/types';
import { createUninitialisedResourceState, isUninitialisedResourceState } from '../../../state';

type StateReducer = ImmutableReducer<EndpointState, AppAction>;
type CaseReducer<T extends AppAction> = (
  state: Immutable<EndpointState>,
  action: Immutable<T>
) => Immutable<EndpointState>;

const handleEndpointPackageInfoStateChanged: CaseReducer<EndpointPackageInfoStateChanged> = (
  state,
  action
) => {
  return {
    ...state,
    endpointPackageInfo: action.payload,
  };
};

const handleMetadataTransformStatsChanged: CaseReducer<MetadataTransformStatsChanged> = (
  state,
  action
) => ({
  ...state,
  metadataTransformStats: action.payload,
});

/* eslint-disable-next-line complexity */
export const endpointListReducer: StateReducer = (state = initialEndpointPageState(), action) => {
  if (action.type === 'serverReturnedEndpointList') {
    const { data, total, page, pageSize, sortDirection, sortField } = action.payload;
    return {
      ...state,
      hosts: data,
      total,
      pageIndex: page,
      pageSize,
      sortField,
      sortDirection,
      loading: false,
      error: undefined,
    };
  } else if (action.type === 'serverFailedToReturnEndpointList') {
    return {
      ...state,
      error: action.payload,
      loading: false,
    };
  } else if (action.type === 'serverReturnedEndpointNonExistingPolicies') {
    return {
      ...state,
      nonExistingPolicies: new Set([...state.nonExistingPolicies, ...action.payload]),
    };
  } else if (action.type === 'serverReturnedMetadataPatterns') {
    // handle an error case
    return {
      ...state,
      patterns: action.payload,
      patternsError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnMetadataPatterns') {
    return {
      ...state,
      patternsError: action.payload,
    };
  } else if (action.type === 'serverReturnedPoliciesForOnboarding') {
    return {
      ...state,
      policyItems: action.payload.policyItems,
      policyItemsLoading: false,
    };
  } else if (action.type === 'serverFailedToReturnPoliciesForOnboarding') {
    return {
      ...state,
      error: action.payload,
      policyItemsLoading: false,
    };
  } else if (action.type === 'userSelectedEndpointPolicy') {
    return {
      ...state,
      selectedPolicyId: action.payload.selectedPolicyId,
    };
  } else if (action.type === 'serverCancelledEndpointListLoading') {
    return {
      ...state,
      loading: false,
    };
  } else if (action.type === 'serverCancelledPolicyItemsLoading') {
    return {
      ...state,
      policyItemsLoading: false,
    };
  } else if (action.type === 'serverFinishedInitialization') {
    return {
      ...state,
      isInitialized: action.payload,
    };
  } else if (action.type === 'endpointPackageInfoStateChanged') {
    return handleEndpointPackageInfoStateChanged(state, action);
  } else if (action.type === 'serverReturnedEndpointExistValue') {
    return {
      ...state,
      endpointsExist: action.payload,
    };
  } else if (action.type === 'serverReturnedAgenstWithEndpointsTotal') {
    return {
      ...state,
      agentsWithEndpointsTotal: action.payload,
      agentsWithEndpointsTotalError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnAgenstWithEndpointsTotal') {
    return {
      ...state,
      agentsWithEndpointsTotalError: action.payload,
    };
  } else if (action.type === 'serverReturnedEndpointsTotal') {
    return {
      ...state,
      endpointsTotal: action.payload,
      endpointsTotalError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnEndpointsTotal') {
    return {
      ...state,
      endpointsTotalError: action.payload,
    };
  } else if (action.type === 'userUpdatedEndpointListRefreshOptions') {
    return {
      ...state,
      isAutoRefreshEnabled: action.payload.isAutoRefreshEnabled ?? state.isAutoRefreshEnabled,
      autoRefreshInterval: action.payload.autoRefreshInterval ?? state.autoRefreshInterval,
    };
  } else if (action.type === 'endpointIsolationRequestStateChange') {
    return handleEndpointIsolationRequestStateChanged(state, action);
  } else if (action.type === 'userChangedUrl') {
    const newState: Immutable<EndpointState> = {
      ...state,
      location: action.payload,
    };
    const isCurrentlyOnListPage = isOnEndpointPage(newState) && !hasSelectedEndpoint(newState);
    const wasPreviouslyOnListPage = isOnEndpointPage(state) && !hasSelectedEndpoint(state);
    const isCurrentlyOnDetailsPage = isOnEndpointPage(newState) && hasSelectedEndpoint(newState);
    const wasPreviouslyOnDetailsPage = isOnEndpointPage(state) && hasSelectedEndpoint(state);

    const stateUpdates: Partial<EndpointState> = {
      location: action.payload,
      error: undefined,
    };

    // Reset `isolationRequestState` if needed
    if (
      uiQueryParams(newState).show !== 'isolate' &&
      !isUninitialisedResourceState(getCurrentIsolationRequestState(newState))
    ) {
      stateUpdates.isolationRequestState = createUninitialisedResourceState();
    }

    // if on the endpoint list page for the first time, return new location and load list
    if (isCurrentlyOnListPage) {
      if (!wasPreviouslyOnListPage) {
        return {
          ...state,
          ...stateUpdates,
          loading: true,
          policyItemsLoading: true,
        };
      }
    } else if (isCurrentlyOnDetailsPage) {
      // if the previous page was the list or another endpoint details page, load endpoint details only
      if (wasPreviouslyOnDetailsPage || wasPreviouslyOnListPage) {
        return {
          ...state,
          ...stateUpdates,
          detailsLoading: true,
        };
      } else {
        // if the previous page was not endpoint list or endpoint details, load both list and details
        return {
          ...state,
          ...stateUpdates,
          loading: true,

          policyItemsLoading: true,
        };
      }
    }
    // otherwise, we are not on an endpoint list or details page
    return {
      ...state,
      ...stateUpdates,
      endpointsExist: true,
    };
  } else if (action.type === 'metadataTransformStatsChanged') {
    return handleMetadataTransformStatsChanged(state, action);
  }

  return state;
};

const handleEndpointIsolationRequestStateChanged: ImmutableReducer<
  EndpointState,
  AppAction & { type: 'endpointIsolationRequestStateChange' }
> = (state, action) => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...state!,
    isolationRequestState: action.payload,
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux';
import type { DataViewBase } from '@kbn/es-query';
import type { IsolationRouteRequestBody } from '../../../../../common/api/endpoint';
import type {
  GetHostPolicyResponse,
  ISOLATION_ACTIONS,
  MetadataListResponse,
} from '../../../../../common/endpoint/types';
import type { ServerApiError } from '../../../../common/types';
import type { GetPolicyListResponse } from '../../policy/types';
import type { EndpointState } from '../types';

export interface ServerReturnedEndpointList {
  type: 'serverReturnedEndpointList';
  payload: MetadataListResponse;
}

export interface ServerFailedToReturnEndpointList {
  type: 'serverFailedToReturnEndpointList';
  payload: ServerApiError;
}

export interface ServerReturnedEndpointPolicyResponse {
  type: 'serverReturnedEndpointPolicyResponse';
  payload: GetHostPolicyResponse;
}

export interface ServerFailedToReturnEndpointPolicyResponse {
  type: 'serverFailedToReturnEndpointPolicyResponse';
  payload: ServerApiError;
}

export interface ServerReturnedPoliciesForOnboarding {
  type: 'serverReturnedPoliciesForOnboarding';
  payload: {
    policyItems: GetPolicyListResponse['items'];
  };
}

export interface ServerFailedToReturnPoliciesForOnboarding {
  type: 'serverFailedToReturnPoliciesForOnboarding';
  payload: ServerApiError;
}

export interface UserSelectedEndpointPolicy {
  type: 'userSelectedEndpointPolicy';
  payload: {
    selectedPolicyId: string;
  };
}

export interface ServerCancelledEndpointListLoading {
  type: 'serverCancelledEndpointListLoading';
}

export interface ServerCancelledPolicyItemsLoading {
  type: 'serverCancelledPolicyItemsLoading';
}

export type EndpointPackageInfoStateChanged = Action<'endpointPackageInfoStateChanged'> & {
  payload: EndpointState['endpointPackageInfo'];
};

export interface ServerReturnedEndpointNonExistingPolicies {
  type: 'serverReturnedEndpointNonExistingPolicies';
  payload: EndpointState['nonExistingPolicies'];
}

export interface ServerFinishedInitialization {
  type: 'serverFinishedInitialization';
  payload: boolean;
}

export interface ServerReturnedEndpointExistValue {
  type: 'serverReturnedEndpointExistValue';
  payload: boolean;
}

export interface ServerReturnedMetadataPatterns {
  type: 'serverReturnedMetadataPatterns';
  payload: DataViewBase[];
}

export interface ServerFailedToReturnMetadataPatterns {
  type: 'serverFailedToReturnMetadataPatterns';
  payload: ServerApiError;
}

export interface UserUpdatedEndpointListRefreshOptions {
  type: 'userUpdatedEndpointListRefreshOptions';
  payload: {
    isAutoRefreshEnabled?: boolean;
    autoRefreshInterval?: number;
  };
}

export interface AppRequestedEndpointList {
  type: 'appRequestedEndpointList';
}

export interface ServerReturnedAgenstWithEndpointsTotal {
  type: 'serverReturnedAgenstWithEndpointsTotal';
  payload: number;
}

export interface ServerFailedToReturnAgenstWithEndpointsTotal {
  type: 'serverFailedToReturnAgenstWithEndpointsTotal';
  payload: ServerApiError;
}

export interface ServerReturnedEndpointsTotal {
  type: 'serverReturnedEndpointsTotal';
  payload: number;
}

export interface ServerFailedToReturnEndpointsTotal {
  type: 'serverFailedToReturnEndpointsTotal';
  payload: ServerApiError;
}

export type EndpointIsolationRequest = Action<'endpointIsolationRequest'> & {
  payload: {
    type: ISOLATION_ACTIONS;
    data: IsolationRouteRequestBody;
  };
};

export type EndpointIsolationRequestStateChange = Action<'endpointIsolationRequestStateChange'> & {
  payload: EndpointState['isolationRequestState'];
};

export type LoadMetadataTransformStats = Action<'loadMetadataTransformStats'>;

export type MetadataTransformStatsChanged = Action<'metadataTransformStatsChanged'> & {
  payload: EndpointState['metadataTransformStats'];
};

export type EndpointAction =
  | ServerReturnedEndpointList
  | ServerFailedToReturnEndpointList
  | ServerReturnedPoliciesForOnboarding
  | ServerFailedToReturnPoliciesForOnboarding
  | UserSelectedEndpointPolicy
  | ServerCancelledEndpointListLoading
  | ServerReturnedEndpointExistValue
  | ServerCancelledPolicyItemsLoading
  | EndpointPackageInfoStateChanged
  | ServerReturnedMetadataPatterns
  | ServerFailedToReturnMetadataPatterns
  | AppRequestedEndpointList
  | ServerReturnedEndpointNonExistingPolicies
  | ServerReturnedAgenstWithEndpointsTotal
  | UserUpdatedEndpointListRefreshOptions
  | ServerReturnedEndpointsTotal
  | ServerFailedToReturnAgenstWithEndpointsTotal
  | ServerFailedToReturnEndpointsTotal
  | EndpointIsolationRequest
  | EndpointIsolationRequestStateChange
  | LoadMetadataTransformStats
  | MetadataTransformStatsChanged
  | ServerFinishedInitialization;

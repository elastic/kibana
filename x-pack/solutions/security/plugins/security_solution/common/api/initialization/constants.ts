/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InitializationFlowIdEnum,
  InitializationFlowReadyResult,
  InitializationFlowErrorResult,
} from './initialization.gen';

export const INITIALIZE_SECURITY_SOLUTION_URL = '/api/security_solution/initialize' as const;
export const INITIALIZE_SECURITY_SOLUTION_SOCKET_TIMEOUT_MS = 2 * 60 * 1000;

// Flow IDs
export const INITIALIZATION_FLOW_CREATE_LIST_INDICES =
  InitializationFlowIdEnum['create-list-indices'];
// TODO: the implementation of this flow is in a follow up PR
export const INITIALIZATION_FLOW_SECURITY_DATA_VIEWS =
  InitializationFlowIdEnum['security-data-views'];

// Flow statuses
export const INITIALIZATION_FLOW_STATUS_READY = InitializationFlowReadyResult.shape.status.value;
export const INITIALIZATION_FLOW_STATUS_ERROR = InitializationFlowErrorResult.shape.status.value;

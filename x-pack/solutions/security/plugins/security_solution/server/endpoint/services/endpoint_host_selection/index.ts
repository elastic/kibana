/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { collectPages } from './collect_pages';
export type { CandidatePage } from './collect_pages';
export {
  MAX_AMBIGUOUS_CANDIDATES,
  isLiveFleetStatus,
  isLiveHostStatus,
  selectEndpointHost,
  toHostStatus,
} from './endpoint_host_selection';
export type {
  EndpointHostSelection,
  EndpointHostCandidate,
} from './endpoint_host_selection';

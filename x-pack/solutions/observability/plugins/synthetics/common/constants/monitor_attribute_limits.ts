/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_ROUTE_STRING_LENGTH = 4096;
// Per-id SO fan-out (bulk update, health); temporary raise from the product 500.
export const MAX_MONITOR_FANOUT_SIZE = 1000;
// Params hold PEM chains / keys; 10KB 400s those. 1MB is a DoS cap, not a product limit.
export const MAX_PARAM_VALUE_LENGTH = 1_000_000;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CircuitBreakerResult } from '../health_diagnostic_circuit_breakers.types';

// helper function to create a success result
export function success(): CircuitBreakerResult {
  return { valid: true };
}

// helper function to create a failure result
export function failure(message: string): CircuitBreakerResult {
  return { valid: false, message };
}

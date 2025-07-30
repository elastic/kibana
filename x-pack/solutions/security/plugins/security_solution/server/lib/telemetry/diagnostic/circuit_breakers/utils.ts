/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CircuitBreaker,
  CircuitBreakerResult,
} from '../health_diagnostic_circuit_breakers.types';

export abstract class BaseCircuitBreaker implements CircuitBreaker {
  abstract validate(): Promise<CircuitBreakerResult>;
  abstract stats(): unknown;
  abstract validationIntervalMs(): number;

  // helper function to create a success result
  protected success(): CircuitBreakerResult {
    return { circuitBreaker: this.constructor.name, valid: true };
  }

  // helper function to create a failure result
  protected failure(message: string): CircuitBreakerResult {
    return { circuitBreaker: this.constructor.name, valid: false, message };
  }
}

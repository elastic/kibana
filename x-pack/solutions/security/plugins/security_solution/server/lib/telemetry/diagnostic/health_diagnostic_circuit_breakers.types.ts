/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface for implementing a circuit breaker pattern.
 * Provides validation logic and exposes internal statistics.
 */
export interface CircuitBreaker {
  /**
   * Checks if the circuit breaker is currently valid.
   *
   * @returns Circuit breaker validation result
   */
  validate(): Promise<CircuitBreakerResult>;

  /**
   * Returns statistics related to the circuit breaker.
   *
   * The structure is implementation-specific.
   */
  stats(): unknown;

  /**
   * Gets the interval (in milliseconds) at which the circuit should be revalidated.
   */
  validationIntervalMs(): number;
}

/**
 * Result of a circuit breaker validation.
 */
export interface CircuitBreakerResult {
  /**
   * The name of the circuit breaker that was validated.
   */
  circuitBreaker: string;
  /**
   * Whether the circuit is currently considered valid.
   */
  valid: boolean;

  /**
   * Optional message providing context about the validation result.
   */
  message?: string;
}

export class ValidationError extends Error {
  constructor(public result: CircuitBreakerResult) {
    super(result.message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
